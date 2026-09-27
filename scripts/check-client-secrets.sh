#!/usr/bin/env bash
# scripts/check-client-secrets.sh
set -euo pipefail

src="apps/frontend/src"
bundle="apps/frontend/.next/static"
fail=0

if grep -rnE "NEXT_PUBLIC_TRUSTLESS|TrustlessWorkProvider|@trustless-work/" "$src"; then
  echo "❌ Trustless Work configuration or SDK referenced in frontend source" >&2
  fail=1
fi

if grep -rnE "NEXT_PUBLIC_TRUSTLESS" apps/frontend/.env* turbo.json 2>/dev/null; then
  echo "❌ NEXT_PUBLIC Trustless Work variable declared in env/turbo config" >&2
  fail=1
fi

if [[ -d "$bundle" && -n "${TRUSTLESS_WORK_API_KEY:-}" ]]; then
  if grep -rqF "$TRUSTLESS_WORK_API_KEY" "$bundle"; then
    echo "❌ Trustless Work API key value found in the client bundle" >&2
    fail=1
  fi
fi

[[ $fail -eq 0 ]] && echo "✅ No Trustless Work secrets or SDK in the frontend"
exit $fail
