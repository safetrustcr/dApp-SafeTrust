.PHONY: infra infra-reset dev full stop test lint build help

## infra : Start Docker infra (both tenants)
infra:
	cd infra/backend && bin/start safetrust hotel_industry

## infra-reset : Tear down volumes and restart infra
infra-reset:
	cd infra/backend && docker compose down -v && bin/start safetrust hotel_industry

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
	@if command -v column >/dev/null 2>&1; then \
		grep -E '^## ' Makefile | sed 's/## /  make /' | column -t -s ':'; \
	else \
		grep -E '^## ' Makefile | sed -E 's/## /  make /; s/ *: /|/' | awk -F'|' '{printf "%-20s%s\n", $$1, $$2}'; \
	fi
	@echo ""
