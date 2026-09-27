#!/usr/bin/env bash
# check-client-secrets.sh
#
# Guards against shipping secrets into the browser bundle.
#
# Rules
# ──────
# 1. NEXT_PUBLIC_E2E_WALLET must NEVER be "true" in a production build.
#    The e2e wallet provider injects a signing shim that must not reach real users.
#
# 2. No .next/static file may contain anything that looks like a Stellar secret
#    key (S + 55 base32 characters).
#
# Called by: next.config.mjs (afterBuild hook) and CI lint step.

set -euo pipefail

PASS=0
FAIL=0

# ── Rule 1: E2E wallet flag must not be set in production ────────────────────
if [[ "${NEXT_PUBLIC_E2E_WALLET:-}" == "true" ]] && \
   [[ "${NODE_ENV:-}" == "production" || "${NEXT_PUBLIC_VERCEL_ENV:-}" == "production" ]]; then
  echo "❌ NEXT_PUBLIC_E2E_WALLET=true is set in a production build. This is forbidden."
  echo "   The e2e signing shim must never be shipped to production users."
  FAIL=$((FAIL + 1))
else
  echo "✅ E2E_WALLET flag is safe (not set in production context)"
  PASS=$((PASS + 1))
fi

# ── Rule 2: No Stellar secret keys in static bundle ─────────────────────────
STATIC_DIR="${NEXT_BUILD_DIR:-.next}/static"
if [[ -d "$STATIC_DIR" ]]; then
  # Stellar secret keys: 'S' followed by 55 uppercase base32 characters
  if grep -r --include="*.js" -l '[S][A-Z2-7]\{55\}' "$STATIC_DIR" 2>/dev/null | grep -q .; then
    echo "❌ Stellar secret key pattern found in .next/static bundle!"
    grep -r --include="*.js" -l '[S][A-Z2-7]\{55\}' "$STATIC_DIR"
    FAIL=$((FAIL + 1))
  else
    echo "✅ No Stellar secret key patterns found in static bundle"
    PASS=$((PASS + 1))
  fi
else
  echo "⚠️  .next/static directory not found — skipping bundle scan (run after build)"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "check-client-secrets: ${PASS} passed, ${FAIL} failed"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
