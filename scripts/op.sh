#!/usr/bin/env bash
set -euo pipefail

case ${1:?usage: op.sh dev|prod <command>} in
  dev)
    environment=${FLATSBY_OP_ENVIRONMENT:?set FLATSBY_OP_ENVIRONMENT to your 1Password dev Environment ID}
    # A read-only service account for the dev Environment skips the desktop
    # unlock prompt, so agents can run `pnpm op` unattended.
    if [ -z "${OP_SERVICE_ACCOUNT_TOKEN:-}" ] &&
      token=$(security find-generic-password -s flatsby-op-dev -w 2>/dev/null); then
      export OP_SERVICE_ACCOUNT_TOKEN="$token"
    fi
    ;;
  prod)
    environment=${FLATSBY_OP_PROD_ENVIRONMENT:?set FLATSBY_OP_PROD_ENVIRONMENT to your 1Password production Environment ID}
    unset OP_SERVICE_ACCOUNT_TOKEN
    ;;
  *)
    echo "usage: op.sh dev|prod <command>" >&2
    exit 2
    ;;
esac
shift
# Without a command, `env` below would print every secret.
if [ $# -eq 0 ]; then
  echo "usage: pnpm op <command>" >&2
  exit 2
fi

# The command gets the Environment's secrets, not the token that read them.
exec op run --no-masking --environment "$environment" -- env -u OP_SERVICE_ACCOUNT_TOKEN "$@"
