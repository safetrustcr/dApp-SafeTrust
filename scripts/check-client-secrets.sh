#!/usr/bin/env bash
set -euo pipefail

client_root="apps/frontend/src"

if rg -n 'NEXT_PUBLIC_TRUSTLESS_WORK_API_KEY|NEXT_PUBLIC_TRUSTLESS_WORK|TrustlessWorkProvider' "$client_root"; then
  echo 'Client-side Trustless Work configuration is forbidden.' >&2
  exit 1
fi

echo 'No Trustless Work configuration is present in frontend source.'
