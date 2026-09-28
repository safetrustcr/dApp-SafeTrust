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

if [[ -n "${TRUSTLESS_WORK_API_KEY:-}" ]]; then
  if [[ ! -d "$bundle" ]]; then
    echo "❌ Production bundle not found; cannot verify Trustless Work API key" >&2
    fail=1
  else
    if grep -rqF "$TRUSTLESS_WORK_API_KEY" "$bundle"; then
      echo "❌ Trustless Work API key value found in the client bundle" >&2
      fail=1
    fi
  fi
elif [[ "${REQUIRE_BUNDLE_KEY:-false}" == "true" ]]; then
  echo "❌ TRUSTLESS_WORK_API_KEY is required for the trusted bundle scan" >&2
  fail=1
else
  echo "⚠️ Bundle key scan skipped: TRUSTLESS_WORK_API_KEY is unavailable (expected for pull requests)" >&2
fi

[[ $fail -eq 0 ]] && echo "✅ No Trustless Work source leaks detected${TRUSTLESS_WORK_API_KEY:+; trusted bundle scan passed}"
exit $fail
