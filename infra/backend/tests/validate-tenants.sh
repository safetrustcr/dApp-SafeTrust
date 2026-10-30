#!/usr/bin/env bash
# Automated tests covering validation rules for bin/validate-tenants
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN="$SCRIPT_DIR/../bin/validate-tenants"

pass_count=0
fail_count=0

assert_success() {
  local input="$1"
  local expected="$2"
  local output=""
  local code=0
  output=$($BIN $input 2>&1) || code=$?
  if [[ "$code" -eq 0 && "$output" == "$expected" ]]; then
    echo "PASS: '$input' -> '$output'"
    pass_count=$((pass_count + 1))
  else
    echo "FAIL: '$input' expected '$expected' (exit 0), got exit $code with output '$output'"
    fail_count=$((fail_count + 1))
  fi
}

assert_exit2() {
  local input="$1"
  local err_substr="$2"
  local output=""
  local code=0
  output=$($BIN $input 2>&1) || code=$?
  if [[ "$code" -eq 2 && "$output" == *"$err_substr"* ]]; then
    echo "PASS (exit 2): '$input' -> matched '$err_substr'"
    pass_count=$((pass_count + 1))
  else
    echo "FAIL: '$input' expected exit 2 containing '$err_substr', got code $code output: '$output'"
    fail_count=$((fail_count + 1))
  fi
}

echo "Running validate-tenants tests..."

# 1. Missing / empty
assert_exit2 "" "TENANTS is required. Example: make infra TENANTS=safetrust"

# 2. 1 or 2 names, all valid, no duplicates
assert_success "safetrust" "safetrust"
assert_success "hotel_industry" "hotel_industry"
assert_success "safetrust hotel_industry" "safetrust hotel_industry"
assert_success "safetrust,hotel_industry" "safetrust hotel_industry"
assert_success "hotel_industry,safetrust" "hotel_industry safetrust"

# 3. More than 2 names
assert_exit2 "safetrust hotel_industry extra" "Pass one or two tenants, got 3."

# 4. Unknown name
assert_exit2 "hotel" "Unknown tenant 'hotel'."

# 5. Duplicate
assert_exit2 "safetrust safetrust" "Tenant 'safetrust' is listed twice."

# 6. Name with characters outside [a-z_]
assert_exit2 "safetrust;rm" "Invalid tenant name 'safetrust;rm'."
assert_exit2 "SafeTrust" "Invalid tenant name 'SafeTrust'."
assert_exit2 "safetrust-1" "Invalid tenant name 'safetrust-1'."

echo ""
echo "Results: $pass_count passed, $fail_count failed"
if [[ "$fail_count" -gt 0 ]]; then
  exit 1
fi
