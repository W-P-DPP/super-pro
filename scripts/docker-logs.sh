#!/usr/bin/env sh
set -eu

DEPLOY_ENV="${DEPLOY_ENV:-prod}"

if [ "$#" -gt 0 ]; then
  node scripts/docker-compose-run.cjs "$DEPLOY_ENV" logs "$@"
else
  node scripts/docker-compose-run.cjs "$DEPLOY_ENV" logs
fi
