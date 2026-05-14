.PHONY: help setup setup-no-mise dev toc gen format lint build test test-api test-web test-e2e test-e2e-api test-e2e-web test-all check check-no-e2e
.DEFAULT_GOAL := help

help: ## 使用可能なコマンドを表示
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## 環境構築（mise導入前提）
	mise install
	pnpm install
	cd apps/api && uv sync

setup-no-mise: ## 環境構築（mise未導入前提）
	pnpm install
	cd apps/api && uv sync

dev: ## 開発サーバを起動
	pnpm run dev

toc: ## 目次自動生成
	pnpm run toc

gen: ## OpenAPI 型更新（apps/api・apps/web）
	cd apps/api && uv run datamodel-codegen \
	  --input ../../docs/auth/openapi.json \
	  --input-file-type openapi \
	  --output src/app/schemas/auth_api_generated.py \
	  --output-model-type pydantic_v2.BaseModel \
	  --use-annotated \
	  --field-constraints \
	  --formatters black isort
	cd apps/api && uv run python scripts/export_openapi.py
	pnpm --filter web run gen

format: ## フォーマット整形
	pnpm run format

lint: ## 静的解析
	pnpm run lint

build: ## ビルド
	pnpm run build

test: ## 単体テスト（API・WEB）
	$(MAKE) test-api
	$(MAKE) test-web

test-api: ## 単体テスト（API）
	cd apps/api && uv run pytest

test-web: ## 単体テスト（WEB）
	pnpm --filter web test:run

test-e2e: ## E2Eテスト（API・WEB）
	pnpm --filter web test:e2e

test-e2e-api: ## E2Eテスト（API）
	@:

test-e2e-web: ## E2Eテスト（WEB）
	pnpm --filter web test:e2e	

test-all: ## 単体テスト・E2Eテスト
	$(MAKE) test
	$(MAKE) test-e2e

check: ## 目次自動生成・OpenAPI 型更新・フォーマット整形・静的解析・ビルド・単体テスト・E2Eテスト
	$(MAKE) check-no-e2e
	$(MAKE) test-e2e

check-no-e2e: ## 目次自動生成・OpenAPI 型更新・フォーマット整形・静的解析・ビルド・単体テスト
	$(MAKE) toc
	$(MAKE) gen
	$(MAKE) format
	$(MAKE) lint
	$(MAKE) build
	$(MAKE) test
