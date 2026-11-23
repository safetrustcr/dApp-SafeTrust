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

# ── Hasura admin secret (#553) ───────────────────────────────────────────────
# The browser authenticates to Hasura with the Firebase ID token only. Any
# NEXT_PUBLIC_* value is inlined into client JS, so an admin secret there gives
# every visitor full database access.

if [[ -n "${NEXT_PUBLIC_HASURA_ADMIN_SECRET:-}" ]]; then
  echo "❌ NEXT_PUBLIC_HASURA_ADMIN_SECRET is set in the build environment" >&2
  fail=1
fi

if grep -rnE "NEXT_PUBLIC_HASURA_ADMIN_SECRET" "$src"; then
  echo "❌ NEXT_PUBLIC_HASURA_ADMIN_SECRET referenced in frontend source" >&2
  fail=1
fi

if grep -rnE "NEXT_PUBLIC_HASURA_ADMIN_SECRET" apps/frontend/.env* turbo.json 2>/dev/null; then
  echo "❌ NEXT_PUBLIC_HASURA_ADMIN_SECRET declared in env/turbo config" >&2
  fail=1
fi

if [[ -d "$bundle" ]]; then
  if grep -rliE "x-hasura-admin-secret|myadminsecretkey" "$bundle"; then
    echo "❌ Hasura admin secret header or default secret found in the client bundle" >&2
    fail=1
  fi
  if [[ -n "${HASURA_ADMIN_SECRET:-}" ]] && grep -rlF "$HASURA_ADMIN_SECRET" "$bundle"; then
    echo "❌ HASURA_ADMIN_SECRET value found in the client bundle" >&2
    fail=1
  fi
else
  echo "⚠️ Hasura bundle scan skipped: $bundle not found (run after next build)" >&2
fi

[[ $fail -eq 0 ]] && echo "✅ No client secret leaks detected${TRUSTLESS_WORK_API_KEY:+; trusted bundle scan passed}"
exit $fail
