#!/usr/bin/env bash
# A read-only service account for the dev Environment skips the desktop unlock
# prompt, so agents can run `pnpm op` unattended. Without it, op asks as before.
if token=$(security find-generic-password -s flatsby-op-dev -w 2>/dev/null); then
  export OP_SERVICE_ACCOUNT_TOKEN="$token"
fi
exec op run --no-masking --environment azz4y2ohqppyjg4f3cssxtxbia -- "$@"
