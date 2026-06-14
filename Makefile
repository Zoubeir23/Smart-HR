# Smart-HR Makefile
-include .env
export

.PHONY: help frontend-install frontend-dev frontend-build frontend-test frontend-lint \
        up down down-v restart build rebuild logs shell dbshell makemigrations migrate \
        check test createsuperuser collectstatic flush-db celery-logs docs-build reset
