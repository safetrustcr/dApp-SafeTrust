#!/usr/bin/env bash
# Verifies hotel_industry row-level permissions against a running Hasura.
#
# Uses the admin secret to (a) create two throwaway managers with one hotel each
# and (b) impersonate roles via x-hasura-role / x-hasura-user-id. Hasura applies
# the role's permission filters exactly as it would for a real JWT.
# Fixtures are removed on exit.
#
# Usage:  infra/backend/tests/hotel-permissions.sh
# Env:    HASURA_GRAPHQL_URL (default http://localhost:8080/v1/graphql)
#         HASURA_GRAPHQL_ADMIN_SECRET (default myadminsecretkey)
# Needs:  curl, jq
# shellcheck disable=SC2016  # GraphQL $variables are intentionally single-quoted
# shellcheck disable=SC2015  # pass/fail always succeed, so A && B || C is safe
set -euo pipefail

HASURA="${HASURA_GRAPHQL_URL:-http://localhost:8080/v1/graphql}"
SECRET="${HASURA_GRAPHQL_ADMIN_SECRET:-myadminsecretkey}"
RUN="$(date +%s)$$"
UID_A="test-mgr-a-$RUN"
UID_B="test-mgr-b-$RUN"
FAILS=0

gql() { # gql <role|""> <uid|""> <query> [variables-json]
  local role="$1" uid="$2" query="$3" vars="${4:-{\}}"
  local headers=(-H "content-type: application/json" -H "x-hasura-admin-secret: $SECRET")
  [[ -n "$role" ]] && headers+=(-H "x-hasura-role: $role")
  [[ -n "$uid" ]] && headers+=(-H "x-hasura-user-id: $uid")
  curl -sS "$HASURA" "${headers[@]}" \
    -d "$(jq -nc --arg q "$query" --argjson v "$vars" '{query: $q, variables: $v}')"
}

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILS=$((FAILS + 1)); }

cleanup() {
  gql "" "" 'mutation ($a: String!, $b: String!) {
    delete_hotels(where: { owner: { firebase_uid: { _in: [$a, $b] } } }) { affected_rows }
    delete_hotel_users(where: { firebase_uid: { _in: [$a, $b] } }) { affected_rows }
  }' "$(jq -nc --arg a "$UID_A" --arg b "$UID_B" '{a: $a, b: $b}')" >/dev/null || true
}
trap cleanup EXIT

echo "▶ Creating fixtures"
FIXTURE=$(gql "" "" 'mutation ($a: String!, $b: String!, $ea: String!, $eb: String!) {
  a: insert_hotel_users_one(object: { firebase_uid: $a, email: $ea, role: "MANAGER",
       hotels: { data: [{ name: "Perm Test Hotel A", address: "Calle A 1" }] } }) { id hotels { id } }
  b: insert_hotel_users_one(object: { firebase_uid: $b, email: $eb, role: "MANAGER",
       hotels: { data: [{ name: "Perm Test Hotel B", address: "Calle B 2" }] } }) { id hotels { id } }
}' "$(jq -nc --arg a "$UID_A" --arg b "$UID_B" --arg ea "$UID_A@perm.test" --arg eb "$UID_B@perm.test" \
      '{a: $a, b: $b, ea: $ea, eb: $eb}')")
if echo "$FIXTURE" | jq -e '.errors' >/dev/null; then echo "$FIXTURE" | jq .; exit 1; fi
HOTEL_A=$(echo "$FIXTURE" | jq -r '.data.a.hotels[0].id')
HOTEL_B=$(echo "$FIXTURE" | jq -r '.data.b.hotels[0].id')

echo "▶ Manager isolation"
IDS_A=$(gql hotel_manager "$UID_A" '{ hotels { id } }' | jq -r '[.data.hotels[].id] | sort | join(",")')
IDS_B=$(gql hotel_manager "$UID_B" '{ hotels { id } }' | jq -r '[.data.hotels[].id] | sort | join(",")')
[[ "$IDS_A" == "$HOTEL_A" ]] && pass "manager A sees exactly hotel A" || fail "manager A sees: $IDS_A"
[[ "$IDS_B" == "$HOTEL_B" ]] && pass "manager B sees exactly hotel B" || fail "manager B sees: $IDS_B"

CROSS=$(gql hotel_manager "$UID_B" 'query ($id: uuid!) { hotels_by_pk(id: $id) { id } }' \
  "$(jq -nc --arg id "$HOTEL_A" '{id: $id}')" | jq -r '.data.hotels_by_pk')
[[ "$CROSS" == "null" ]] && pass "manager B cannot fetch hotel A by id" || fail "manager B fetched hotel A"

AGG=$(gql hotel_manager "$UID_B" '{ hotels_aggregate { aggregate { count } } }' | jq -r '.data.hotels_aggregate.aggregate.count')
[[ "$AGG" == "1" ]] && pass "aggregate count is scoped (1)" || fail "manager B aggregate count = $AGG"

echo "▶ Roles without hotel permissions"
for role in guest host; do
  OUT=$(gql "$role" "$UID_A" '{ hotels { id } }')
  if echo "$OUT" | jq -e '.errors' >/dev/null; then pass "role '$role' cannot query hotels"; else fail "role '$role' got: $OUT"; fi
done

echo "▶ Unknown user with the manager role"
NONE=$(gql hotel_manager "not-a-hotel-user-$RUN" '{ hotels { id } }' | jq -r '.data.hotels | length')
[[ "$NONE" == "0" ]] && pass "manager role without a hotel_users row sees nothing" || fail "saw $NONE hotels"

echo "▶ Platform admin"
ADMIN=$(gql admin "$UID_A" 'query ($ids: [uuid!]!) { hotels(where: { id: { _in: $ids } }) { id } }' \
  "$(jq -nc --arg a "$HOTEL_A" --arg b "$HOTEL_B" '{ids: [$a, $b]}')" | jq -r '.data.hotels | length')
[[ "$ADMIN" == "2" ]] && pass "admin sees both managers' hotels" || fail "admin saw $ADMIN of 2"

echo
if [[ "$FAILS" -eq 0 ]]; then echo "✅ hotel permissions OK"; else echo "❌ $FAILS check(s) failed"; exit 1; fi