TENANTS ?=

.PHONY: infra infra-reset testnet dev full stop test lint build help metadata-check

## infra : Start Docker infra for one or two tenants: make infra TENANTS="safetrust hotel_industry"
infra:
	@tenants="$$(infra/backend/bin/validate-tenants $(TENANTS))" || exit $$?; \
	if [ "$$(echo "$$tenants" | wc -w)" -gt 1 ]; then \
		echo "warning: combined start applies metadata per tenant; only the last tenant may stay tracked."; \
		echo "         See docs/architecture/multi-tenant.md (#___). Run \`bin/metadata-check\` after startup."; \
	fi; \
	echo "Starting tenants: $$tenants"; \
	cd infra/backend && bin/start $$tenants

## testnet : Provision isolated Stellar testnet accounts and linked demo users
testnet:
	pnpm testnet:provision

## infra-reset : Tear down volumes and restart infra: make infra-reset TENANTS=safetrust
infra-reset:
	@tenants="$$(infra/backend/bin/validate-tenants $(TENANTS))" || exit $$?; \
	if [ "$$(echo "$$tenants" | wc -w)" -gt 1 ]; then \
		echo "warning: combined start applies metadata per tenant; only the last tenant may stay tracked."; \
		echo "         See docs/architecture/multi-tenant.md (#___). Run \`bin/metadata-check\` after startup."; \
	fi; \
	cd infra/backend && docker compose down -v && bin/start $$tenants

## metadata-check : Verify Hasura metadata consistency
metadata-check:
	cd infra/backend && bin/metadata-check

## stop : Stop Docker infra
stop:
	cd infra/backend && docker compose down

## dev : Start all dev servers (api + web)
dev:
	pnpm run dev

## full : Start infra + dev servers together
full: infra dev

## test : Run all tests
test:
	pnpm test

## lint : Run linter across all packages
lint:
	pnpm lint

## build : Build all packages
build:
	pnpm build

## help : Show this help
help:
	@echo ""
	@echo "SafeTrust — available make targets:"
	@echo ""
	@grep -E '^## ' Makefile | sed 's/## /  make /' | column -t -s ':'
	@echo ""
