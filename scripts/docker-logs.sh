#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

if [ "$#" -gt 0 ]; then
  docker compose -f "$COMPOSE_FILE" logs -f --tail=200 "$@"
else
  docker compose -f "$COMPOSE_FILE" logs -f --tail=200
fi
