# Recipes call go directly so they work on Windows cmd and Unix.
# DATABASE_URL and other secrets come from ws/.env (godotenv) or the shell.

.PHONY: run-api test test-integration test-all build swagger migrate-up migrate-down migrate-fresh migrate-fresh-seed migrate-rollback migrate-status migrate-create seed docker-db-up docker-db-down

run-api:
	go run ./cmd/api

test:
	go test ./...

test-integration:
	go test -race -tags=integration -timeout=5m ./test/integration/...

test-all: test test-integration

build:
	go build -o bin/api ./cmd/api

swagger:
	swag init -g cmd/api/main.go --parseInternal --output docs

migrate-up:
	go run ./cmd/migrate up

migrate-down:
	go run ./cmd/migrate down

migrate-fresh:
	go run ./cmd/migrate fresh

migrate-fresh-seed: migrate-fresh seed

migrate-rollback:
	go run ./cmd/migrate rollback $(or $(step),1)

migrate-status:
	go run ./cmd/migrate status

migrate-create:
	go run ./cmd/migrate create $(name)

seed:
	go run ./cmd/seed

docker-db-up:
	docker compose --env-file .env -f deployments/docker-compose.yml up -d db

docker-db-down:
	docker compose --env-file .env -f deployments/docker-compose.yml down
