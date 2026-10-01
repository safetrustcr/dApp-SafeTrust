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

# Ensure database sources are registered for each tenant
for TENANT in "${TENANTS[@]}"; do
  echo "Checking if source $TENANT already exists..."
  CHECK_SOURCE=$(curl -s -X POST "${ENDPOINT}/v1/metadata" \
    -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
    -H "Content-Type: application/json" \
    -d "{\"type\": \"pg_get_source_tables\", \"args\": {\"source\": \"${TENANT}\"}}")

  if [[ "$CHECK_SOURCE" == *"error"* ]]; then
    echo "Creating source $TENANT..."
    SOURCE_RESPONSE=$(curl -s -X POST "${ENDPOINT}/v1/metadata" \
      -H "X-Hasura-Admin-Secret: ${ADMIN_SECRET}" \
      -H "Content-Type: application/json" \
      -d "{
        \"type\": \"pg_add_source\",
        \"args\": {
          \"name\": \"${TENANT}\",
          \"configuration\": {
            \"connection_info\": {
              \"database_url\": {\"from_env\": \"PG_DATABASE_URL\"},
              \"isolation_level\": \"read-committed\",
              \"use_prepared_statements\": false
            }
          }
        }
      }")
    if [[ "$SOURCE_RESPONSE" == *"error"* ]]; then
      echo "❌ Failed to create source: $SOURCE_RESPONSE"
      exit 1
    fi
    echo "✅ Source $TENANT created"
  else
    echo "Source $TENANT already exists, skipping"
  fi
done

# Step 1 — Build metadata project containing all selected tenants
echo "▶ Step 1/2 — Building metadata for: ${TENANTS[*]}"
BUILD_DIR="$SCRIPT_DIR/build"

if [[ ${#TENANTS[@]} -eq 1 ]]; then
  TENANT="${TENANTS[0]}"
  bash "$SCRIPT_DIR/build-metadata.sh" "$TENANT"
  PROJECT_DIR="$BUILD_DIR/$TENANT"
else
  # Build each tenant metadata first
  for TENANT in "${TENANTS[@]}"; do
    bash "$SCRIPT_DIR/build-metadata.sh" "$TENANT"
  done

  # Combine into one metadata project
  COMBINED_DIR="$BUILD_DIR/combined"
  rm -rf "$COMBINED_DIR"
  mkdir -p "$COMBINED_DIR/metadata"

  # Copy base and config from first tenant build
  cp -r "$BUILD_DIR/${TENANTS[0]}"/* "$COMBINED_DIR/"
  rm -rf "$COMBINED_DIR/metadata/databases"
  mkdir -p "$COMBINED_DIR/metadata/databases"

  > "$COMBINED_DIR/metadata/databases/databases.yaml"
  for TENANT in "${TENANTS[@]}"; do
    TENANT_BUILD="$BUILD_DIR/$TENANT"
    mkdir -p "$COMBINED_DIR/metadata/databases/$TENANT"
    cp -r "$TENANT_BUILD/metadata/databases/tables" "$COMBINED_DIR/metadata/databases/$TENANT/"
    cat >> "$COMBINED_DIR/metadata/databases/databases.yaml" <<EOF
- name: $TENANT
  kind: postgres
  configuration:
    connection_info:
      database_url:
        from_env: PG_DATABASE_URL
      isolation_level: read-committed
      use_prepared_statements: false
  tables: "!include $TENANT/tables/tables.yaml"
EOF
  done
  PROJECT_DIR="$COMBINED_DIR"
fi
echo "✅ Build complete for: ${TENANTS[*]}"
echo ""

# Step 2 — Apply combined metadata once
echo "▶ Step 2/2 — Applying metadata for: ${TENANTS[*]}"
hasura metadata apply \
  --endpoint "$ENDPOINT" \
  --admin-secret "$ADMIN_SECRET" \
  --project "$PROJECT_DIR" \
  --skip-update-check
echo "✅ Metadata apply complete"
echo ""

echo "════════════════════════════════════════"
echo "  ✅ All tenants ready: ${TENANTS[*]}"
echo "════════════════════════════════════════"
