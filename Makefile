.PHONY: help up down build logs ps restart test lint fmt e2e sidecar-test web-test web-lint sidecar-lint shell-web shell-sidecar

# Container engine: kiri (default) or docker
# Usage: make up ENGINE=docker
ENGINE ?= kiri
ifeq ($(ENGINE),docker)
  COMPOSE = docker compose
else
  COMPOSE = kiri compose
endif

help:
	@echo "Targets: up down build logs ps restart test lint fmt shell-web shell-sidecar"
	@echo "Engine:   ENGINE=kiri|docker (default: kiri). Example: make up ENGINE=docker"

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

restart:
	$(COMPOSE) restart

shell-web:
	$(COMPOSE) exec web sh

shell-sidecar:
	$(COMPOSE) exec sidecar sh

web-test:
	$(COMPOSE) exec web php artisan test

sidecar-test:
	$(COMPOSE) exec sidecar npm test

test: web-test sidecar-test

web-lint:
	$(COMPOSE) exec web ./vendor/bin/pint --test
	$(COMPOSE) exec web npm run lint

sidecar-lint:
	$(COMPOSE) exec sidecar npm run lint

lint: web-lint sidecar-lint

fmt:
	$(COMPOSE) exec web ./vendor/bin/pint
	$(COMPOSE) exec sidecar npm run format

e2e:
	cd apps/web && E2E_BASE_URL=http://localhost:8080 npx playwright test
