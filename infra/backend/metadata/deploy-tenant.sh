#!/usr/bin/env bash
set -eo pipefail

BUILD_DIR="$(pwd)/build"
HASURA_ENDPOINT="http://localhost:8080"
HASURA_ADMIN_SECRET="${HASURA_GRAPHQL_ADMIN_SECRET:-myadminsecretkey}"

cleanup() {
    if [[ -n "${TEMP_DIR:-}" && -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
}
trap cleanup EXIT

deploy_tenant() {
    local tenant="$1"
    local hasura_endpoint="$2"
    local admin_secret="$3"

    echo "===========================================" >&2
    echo "Deploying metadata for tenant: $tenant" >&2
    echo "===========================================" >&2

    local build_path="$BUILD_DIR/$tenant"

    if [ ! -d "$build_path" ]; then
        echo "Error: No build found for '$tenant'. Run build-metadata.sh first." >&2
        return 1
    fi

    # Read tenant/source name from databases.yaml
    local tenant_name
    local db_yaml="$build_path/metadata/databases/databases.yaml"
    if [ -f "$db_yaml" ]; then
        tenant_name=$(grep -m 1 "name:" "$db_yaml" | sed 's/.*name:\s*\([^ ]*\).*/\1/')
        echo "Found tenant name in databases.yaml: $tenant_name" >&2
    else
        tenant_name="$tenant"
        echo "No databases.yaml found, using: $tenant_name" >&2
    fi

    # Step 1 — register database source
    echo "Checking if source $tenant_name already exists..." >&2
    local check_source
    check_source=$(curl -s -X POST "${hasura_endpoint}/v1/metadata" \
      -H "X-Hasura-Admin-Secret: ${admin_secret}" \
      -H "Content-Type: application/json" \
      -d "{\"type\": \"pg_get_source_tables\", \"args\": {\"source\": \"${tenant_name}\"}}")

    if [[ "$check_source" == *"error"* ]]; then
        echo "Creating source $tenant_name..." >&2
        local source_response
        source_response=$(curl -s -X POST "${hasura_endpoint}/v1/metadata" \
          -H "X-Hasura-Admin-Secret: ${admin_secret}" \
          -H "Content-Type: application/json" \
          -d "{
            \"type\": \"pg_add_source\",
            \"args\": {
              \"name\": \"${tenant_name}\",
              \"configuration\": {
                \"connection_info\": {
                  \"database_url\": {\"from_env\": \"PG_DATABASE_URL\"},
                  \"isolation_level\": \"read-committed\",
                  \"use_prepared_statements\": false
                }
              }
            }
          }")

        if [[ "$source_response" == *"error"* ]]; then
            echo "❌ Failed to create source: $source_response" >&2
            return 1
        fi
        echo "✅ Source $tenant_name created" >&2
    else
        echo "Source $tenant_name already exists, skipping" >&2
    fi

    # Step 2 — apply full metadata (permissions, relationships, row-level filters)
    # Tables do not need to exist yet — Hasura stores config, reconciles after migrate
    echo "📋 Applying full metadata with permissions for $tenant..." >&2
    if ! hasura metadata apply \
            --endpoint "$hasura_endpoint" \
            --admin-secret "$admin_secret" \
            --project "$build_path"; then
        echo "❌ Metadata apply failed for $tenant" >&2
        return 1
    fi

    echo "✅ Metadata deployment for $tenant completed" >&2
    return 0
}

main() {
    local tenants=()

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --admin-secret) HASURA_ADMIN_SECRET="$2"; shift 2 ;;
            --endpoint)     HASURA_ENDPOINT="$2";     shift 2 ;;
            -*) echo "Unknown option: $1"; exit 1 ;;
            *)  tenants+=("$1"); shift ;;
        esac
    done

    if [ ${#tenants[@]} -eq 0 ]; then
        echo "Usage: ./deploy-tenant.sh <tenant> [--admin-secret SECRET] [--endpoint URL]"
        exit 1
    fi

    echo "Deploying metadata for tenants: ${tenants[*]}"

    local successful_tenants=()
    local failed_tenants=()

    for tenant in "${tenants[@]}"; do
        if deploy_tenant "$tenant" "$HASURA_ENDPOINT" "$HASURA_ADMIN_SECRET"; then
            successful_tenants+=("$tenant")
        else
            failed_tenants+=("$tenant")
        fi
    done

    echo ""
    echo "====== DEPLOYMENT SUMMARY ======"
    echo "Total tenants processed: ${#tenants[@]}"
    echo "Successful deployments: ${#successful_tenants[@]}"
    echo "Failed deployments: ${#failed_tenants[@]}"

    [ ${#successful_tenants[@]} -gt 0 ] && echo "Successfully deployed tenants: ${successful_tenants[*]}"
    [ ${#failed_tenants[@]} -gt 0 ] && { echo "Failed to deploy tenants: ${failed_tenants[*]}"; exit 1; }

    echo "All tenant deployments have been completed!"
}

main "$@"
