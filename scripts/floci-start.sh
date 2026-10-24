#!/usr/bin/env bash

set -euo pipefail

readonly CONTAINER_NAME="floci"
readonly PERSIST_DIR="${HOME}/.floci/data"
readonly BUCKET_NAME="fondo-local-files"

force=false
while (($# > 0)); do
  case "$1" in
    --force)
      force=true
      shift
      ;;
    -h|--help)
      printf 'Usage: pnpm floci:start [--force]\n'
      printf '  --force  Restart a running non-persistent Floci container without prompting.\n'
      exit 0
      ;;
    *)
      printf 'Unknown option: %s\n' "$1" >&2
      exit 2
      ;;
  esac
done

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  fi
}

require_command docker
require_command floci
require_command aws

is_running=false
if [[ -n "$(docker ps -q --filter "name=^${CONTAINER_NAME}$")" ]]; then
  is_running=true
fi

persistent_source=""
storage_mode=""
if $is_running; then
  persistent_source="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Source}}{{end}}{{end}}' "$CONTAINER_NAME")"
  storage_mode="$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$CONTAINER_NAME" | awk -F= '$1 == "FLOCI_STORAGE_MODE" { print $2 }')"
  if [[ "$persistent_source" != "$PERSIST_DIR" || "$storage_mode" != "persistent" ]]; then
    printf 'Floci is not using the requested persistent configuration.\n'
    printf '  /app/data mount: %s\n' "${persistent_source:-none}"
    printf '  storage mode: %s\n' "${storage_mode:-not set}"
    printf 'Restarting will discard data currently held in memory. Continue? (y/N) '

    should_restart=$force
    if ! $should_restart; then
      read -r answer || answer=""
      case "${answer,,}" in
        y|yes) should_restart=true ;;
        *) should_restart=false ;;
      esac
    fi

    if $should_restart; then
      floci stop
      floci start --persist "$PERSIST_DIR"
      is_running=true
      persistent_source="$PERSIST_DIR"
      storage_mode="persistent"
    else
      printf 'Keeping the current non-persistent Floci container.\n'
    fi
  fi
else
  floci start --persist "$PERSIST_DIR"
  is_running=true
  persistent_source="$PERSIST_DIR"
  storage_mode="persistent"
fi

eval "$(floci env)"
export AWS_PAGER=""

if ! aws s3api head-bucket --bucket "$BUCKET_NAME" >/dev/null 2>&1; then
  aws s3 mb "s3://${BUCKET_NAME}"
fi

printf '\nFloci final status:\n'
floci status
printf 'Persistent host path: %s\n' "${persistent_source:-not mounted}"
printf 'Storage mode: %s\n' "${storage_mode:-not set}"
printf 'S3 bucket: %s\n' "$BUCKET_NAME"
aws s3 ls "s3://${BUCKET_NAME}"
