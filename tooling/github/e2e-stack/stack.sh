#!/usr/bin/env bash
# Postgres, schema, websocket proxy and the web app for the e2e suites.
#
#   stack.sh env     print the stack's configuration as KEY=value lines
#   stack.sh start   start everything, configured by `env`'s variables
#   stack.sh stop
#
# STACK_DIR holds the logs (web.log, wsproxy.log, postgres.log) and, without
# Docker, the database itself.
set -euo pipefail

cmd=${1:?usage: stack.sh env|start|stop}
web_port=${PORT:-3000}
pg_port=${PG_PORT:-5433}
proxy_port=${DB_WSPROXY_PORT:-5434}
container=flatsby-e2e-pg-$pg_port
root=$(cd "$(dirname "$0")/../../.." && pwd)

# Callers export these: dotenv never overrides a set variable, and turbo hashes
# the env, not the file. better-auth rejects an undefined clientId; the empty
# service keys stop a developer's own .env sending mail, events or AI calls.
print_env() {
  cat <<EOF
DATABASE_URL=postgres://postgres:postgres@localhost:$pg_port/flatsby
PG_PORT=$pg_port
DB_WSPROXY_PORT=$proxy_port
PORT=$web_port
BETTER_AUTH_URL=http://localhost:$web_port
NEXT_PUBLIC_BETTER_AUTH_BASE_URL=http://localhost:$web_port
BETTER_AUTH_SECRET=e2e-runner-secret
E2E_TESTING=true
GOOGLE_CLIENT_ID=e2e
GOOGLE_CLIENT_SECRET=e2e
APPLE_KEY_ID=e2e
APPLE_TEAM_ID=e2e
APPLE_PRIVATE_KEY=e2e
APPLE_BUNDLE_ID=com.flatcove.app.v2
APPLE_SERVICE_ID=e2e
AI_GATEWAY_API_KEY=
POSTHOG_API_KEY=
RESEND_API_KEY=
EOF
}

if [ "$cmd" = env ]; then
  print_env
  exit
fi
dir=${STACK_DIR:?STACK_DIR is required}

# Zonky's binaries, not brew: brew install stalls for minutes behind a booting
# simulator.
zonky_jar=https://repo1.maven.org/maven2/io/zonky/test/postgres/embedded-postgres-binaries-darwin-arm64v8/17.11.0/embedded-postgres-binaries-darwin-arm64v8-17.11.0.jar
zonky_sha256=a1c2786acb0c398f9b2d76806fc52f5dc8b222cbc8e9383a9b9702084daaf3a5

has_docker() { command -v docker >/dev/null && docker info >/dev/null 2>&1; }

start_postgres() {
  if has_docker; then
    docker rm -f "$container" >/dev/null 2>&1 || true
    docker run -d --name "$container" -p "127.0.0.1:$pg_port:5432" \
      -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=flatsby postgres:17-alpine >/dev/null
    # Over TCP, not the socket: the entrypoint runs a socket-only server while
    # it creates the database, so a socket probe reports ready on a server
    # that is about to shut down and restart.
    local ready="pg_isready -h 127.0.0.1 -p 5432 -U postgres -d flatsby"
    for _ in $(seq 60); do
      docker exec "$container" $ready -q && return
      sleep 1
    done
    docker exec "$container" $ready
  elif [ "$(uname)" = Darwin ]; then
    # Postgres refuses to start ("postmaster became multithreaded during
    # startup") with the incomplete locale settings a GitHub runner leaves.
    local LC_ALL=C LANG=C
    export LC_ALL LANG
    curl -fsSL --retry 5 --retry-all-errors -o "$dir/postgres.jar" "$zonky_jar"
    echo "$zonky_sha256  $dir/postgres.jar" | shasum -a 256 -c
    rm -rf "$dir/postgres" "$dir/pgdata"
    mkdir "$dir/postgres"
    unzip -p "$dir/postgres.jar" '*.txz' | tar -xJ -C "$dir/postgres"
    local bin="$dir/postgres/bin"
    "$bin/initdb" -D "$dir/pgdata" -U postgres --auth=trust --encoding=UTF8 --locale=C
    # Zonky ships no createdb.
    echo "CREATE DATABASE flatsby" | "$bin/postgres" --single -D "$dir/pgdata" postgres \
      >>"$dir/postgres.log" 2>&1
    "$bin/pg_ctl" -D "$dir/pgdata" -l "$dir/postgres.log" -o "-p $pg_port" -w start
  else
    echo "Postgres needs Docker on this platform" >&2
    exit 1
  fi
}

start() {
  # The fresh database, never one an ambient DATABASE_URL or the root .env names.
  while IFS= read -r line; do export "$line"; done < <(print_env)
  mkdir -p "$dir"
  start_postgres

  # Push, not migrate: migration 0000 is a no-op baseline (the schema predates
  # the migration folder), so `drizzle-kit migrate` leaves an empty database
  # empty. Push builds the schema straight from src/schema.ts, which is what
  # the suite should run against anyway.
  pnpm -F @flatsby/db push --force

  # @neondatabase/serverless speaks Postgres over websockets, which a plain
  # Postgres does not; packages/db/src/client.ts routes localhost URLs here.
  nohup node "$root/scripts/local-db-wsproxy.mjs" >"$dir/wsproxy.log" 2>&1 &

  pnpm turbo run build --filter=@flatsby/nextjs
  nohup pnpm -F @flatsby/nextjs start >"$dir/web.log" 2>&1 &

  # Minting one throwaway session is the readiness check: it is the only probe
  # that proves the whole chain (app, proxy, database) works, and it pays the
  # route's module init here instead of inside the first test's wait.
  local url="http://localhost:$web_port"
  for _ in $(seq 60); do
    curl -fsSL -o /dev/null "$url/" && break
    sleep 2
  done
  curl -fsSL -o /dev/null "$url/"
  curl -fsS -X POST -o /dev/null "$url/api/e2e/create-session"
}

# By port, not pid: pnpm starts next-server as a child that outlives pnpm.
stop() {
  # No defaults here: 3000 and 5434 may be someone's `pnpm dev`.
  : "${PORT:?stop needs PORT}" "${PG_PORT:?stop needs PG_PORT}" "${DB_WSPROXY_PORT:?stop needs DB_WSPROXY_PORT}"
  for port in "$web_port" "$proxy_port"; do
    pids=$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
    [ -n "$pids" ] && kill $pids || true
  done
  if [ -d "$dir/pgdata" ]; then
    "$dir/postgres/bin/pg_ctl" -D "$dir/pgdata" -m fast stop >/dev/null || true
  elif has_docker; then
    docker rm -f "$container" >/dev/null 2>&1 || true
  fi
  # A Zonky Postgres whose run folder is gone; only postgres itself, never
  # Docker's port forwarder.
  pids=$(lsof -a -c postgres -nP -tiTCP:"$pg_port" -sTCP:LISTEN 2>/dev/null || true)
  [ -n "$pids" ] && kill $pids || true
}

"$cmd"
