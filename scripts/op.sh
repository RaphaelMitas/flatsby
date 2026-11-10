#!/usr/bin/env bash
# `pnpm op` and `pnpm op-prod`: run a command with secrets from a 1Password
# Environment, named by FLATSBY_OP_ENVIRONMENT or FLATSBY_OP_PROD_ENVIRONMENT.
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

exec op run --no-masking --environment "$environment" -- "$@"
