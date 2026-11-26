.PHONY: help up down build logs ps restart test lint fmt e2e sidecar-test web-test web-lint sidecar-lint shell-web shell-sidecar

help:
	@echo "Targets: up down build logs ps restart test lint fmt shell-web shell-sidecar"

up:
	kiri compose up -d --build

down:
	kiri compose down

build:
	kiri compose build

logs:
	kiri compose logs -f

ps:
	kiri compose ps

restart:
	kiri compose restart

shell-web:
	kiri compose exec web sh

shell-sidecar:
	kiri compose exec sidecar sh

web-test:
	kiri compose exec web php artisan test

sidecar-test:
	kiri compose exec sidecar npm test

test: web-test sidecar-test

web-lint:
	kiri compose exec web ./vendor/bin/pint --test
	kiri compose exec web npm run lint

sidecar-lint:
	kiri compose exec sidecar npm run lint

lint: web-lint sidecar-lint

fmt:
	kiri compose exec web ./vendor/bin/pint
	kiri compose exec sidecar npm run format

e2e:
	cd apps/web && E2E_BASE_URL=http://localhost:8080 npx playwright test
File not found: 
