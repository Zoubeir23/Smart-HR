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
