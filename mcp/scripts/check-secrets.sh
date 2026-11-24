#!/usr/bin/env bash
# mcp/scripts/check-secrets.sh — fails when a Hasura admin secret is committed under mcp/ (#529).
#
#   bash mcp/scripts/check-secrets.sh        # from the repository root
#
# Checks, against tracked files only:
#   1. mcp/.env (or any mcp/.env.* except .env.example) is not tracked.
#   2. No tracked file under mcp/ contains a known admin-secret value: the
#      well-known local defaults, plus HASURA_ADMIN_SECRET /
#      HASURA_GRAPHQL_ADMIN_SECRET from the environment and from the local
#      (ignored) infra/backend/.env and mcp/.env when they exist.
#   3. mcp/src never falls back to a literal admin secret.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
self="mcp/scripts/check-secrets.sh"
fail=0

tracked_env=$(git ls-files -- 'mcp/.env' 'mcp/.env.*' | grep -vx 'mcp/.env.example' || true)
if [[ -n "$tracked_env" ]]; then
  echo "❌ Local MCP env file is tracked: $tracked_env" >&2
  fail=1
fi

secrets=("myadminsecretkey")
for name in HASURA_ADMIN_SECRET HASURA_GRAPHQL_ADMIN_SECRET; do
  [[ -n "${!name:-}" ]] && secrets+=("${!name}")
done
for file in infra/backend/.env mcp/.env; do
  [[ -f "$file" ]] || continue
  while IFS= read -r value; do
    value="${value%\"}"; value="${value#\"}"; value="${value%\'}"; value="${value#\'}"
    [[ -n "$value" ]] && secrets+=("$value")
  done < <(sed -nE 's/^\s*(export\s+)?HASURA(_GRAPHQL)?_ADMIN_SECRET\s*=\s*(.*)\s*$/\3/p' "$file")
done

mapfile -d '' files < <(git ls-files -z -- mcp ':!:'"$self")
hits=""
for secret in "${secrets[@]}"; do
  # Placeholders and very short values would only produce noise.
  [[ ${#secret} -lt 8 || "$secret" == replace-with-* ]] && continue
  hits+=$(grep -lF -- "$secret" "${files[@]}" 2>/dev/null || true)$'\n'
done
hits=$(printf '%s' "$hits" | sed '/^$/d' | sort -u)
if [[ -n "$hits" ]]; then
  # Name the files, never the value: CI logs are public.
  echo "❌ Hasura admin secret value found in tracked file(s):" >&2
  echo "$hits" | sed 's/^/   /' >&2
  fail=1
fi

if grep -rnE "(ADMIN_SECRET|adminSecret)['\"]?\)?\s*(\?\?|\|\|)\s*['\"\`]|x-hasura-admin-secret['\"]?\s*:\s*['\"\`]" mcp/src; then
  echo "❌ mcp/src falls back to a literal Hasura admin secret" >&2
  fail=1
fi

[[ $fail -eq 0 ]] && echo "✅ No Hasura admin secret committed under mcp/"
exit $fail
