#!/usr/bin/env bash
set -eo pipefail

# ─────────────────────────────────────────────
# setup-tenant.sh
# Runs build-metadata.sh then deploy-tenant.sh
# for one or all tenants in a single command.
#
# Usage:
#   ./setup-tenant.sh <tenant_name> [--admin-secret SECRET] [--endpoint URL]
#   ./setup-tenant.sh safetrust
#   ./setup-tenant.sh safetrust --admin-secret myadminsecretkey --endpoint http://localhost:8080
# ─────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Defaults
ADMIN_SECRET="${HASURA_GRAPHQL_ADMIN_SECRET:-myadminsecretkey}"
ENDPOINT="http://localhost:8080"
TENANTS=()

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --admin-secret)
    if [[ -z "${2:-}" || "${2:0:1}" == "-" ]]; then
        echo "Error: --admin-secret requires a value"
        exit 1
    fi
      ADMIN_SECRET="$2"
      shift 2
      ;;
    --endpoint)
    if [[ -z "${2:-}" || "${2:0:1}" == "-" ]]; then
        echo "Error: --endpoint requires a value"
        exit 1
    fi
      ENDPOINT="$2"
      shift 2
      ;;
    -*)
      echo "Unknown option: $1"
      exit 1
      ;;
    *)
      TENANTS+=("$1")
      shift
      ;;
  esac
done

if [[ ${#TENANTS[@]} -eq 0 ]]; then
  echo "Usage: ./setup-tenant.sh <tenant_name>... [--admin-secret SECRET] [--endpoint URL]"
  echo "Example: ./setup-tenant.sh safetrust --endpoint http://localhost:8080"
  exit 1
fi

if [[ -z "$ADMIN_SECRET" ]]; then
  echo "Error: admin secret is required (use --admin-secret or HASURA_GRAPHQL_ADMIN_SECRET)"
  exit 1
fi

echo ""
echo "════════════════════════════════════════"
echo "  SafeTrust Tenant Setup"
echo "  Tenants:  ${TENANTS[*]}"
echo "  Endpoint: $ENDPOINT"
echo "════════════════════════════════════════"
echo ""

for TENANT in "${TENANTS[@]}"; do
  # Step 1 — Build metadata
  echo "▶ Step 1/2 — Building metadata for: $TENANT"
  bash "$SCRIPT_DIR/build-metadata.sh" "$TENANT"
  echo "✅ Build complete for $TENANT"
  echo ""

  # Step 2 — Deploy tenant
  echo "▶ Step 2/2 — Deploying tenant: $TENANT"
  bash "$SCRIPT_DIR/deploy-tenant.sh" "$TENANT" \
    --admin-secret "$ADMIN_SECRET" \
    --endpoint "$ENDPOINT"
  echo "✅ Deploy complete for $TENANT"
  echo ""

  echo "════════════════════════════════════════"
  echo "  ✅ $TENANT is ready"
  echo "════════════════════════════════════════"
done