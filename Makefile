# Smart-HR Makefile
-include .env
export

.PHONY: help frontend-install frontend-dev frontend-build frontend-test frontend-lint \
        up down down-v restart build rebuild logs shell dbshell makemigrations migrate \
        check test createsuperuser collectstatic flush-db celery-logs docs-build reset

help: ## Affiche cette aide
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ==============================================================================
# FRONTEND COMMANDS
# ==============================================================================
frontend-install: ## Installe les dépendances frontend
	cd Frontend && npm install

frontend-dev: ## Lance le serveur de développement React
	cd Frontend && npm run dev

frontend-build: ## Compile le frontend pour la production
	cd Frontend && npm run build

frontend-test: ## Lance les tests vitest
	cd Frontend && npm run test

frontend-lint: ## Vérifie le code frontend avec ESLint
	cd Frontend && npm run lint

# ==============================================================================
# DOCKER COMMANDS
# ==============================================================================
up: ## Lance les conteneurs Docker en arrière-plan
	cd Backend && docker compose -f docker-compose.local.yml up -d

down: ## Stoppe les conteneurs Docker
	cd Backend && docker compose -f docker-compose.local.yml down

down-v: ## Stoppe les conteneurs et supprime les volumes
	cd Backend && docker compose -f docker-compose.local.yml down -v
