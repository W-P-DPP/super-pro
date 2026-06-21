#!/usr/bin/env sh
set -eu

DEPLOY_ENV="${DEPLOY_ENV:-prod}"

node scripts/docker-compose-run.cjs "$DEPLOY_ENV" down
