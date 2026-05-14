# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────
# ステージ 1: ビルダー
# ─────────────────────────────────────────────
FROM node:24-alpine AS builder

# corepack で pnpm を有効化・固定バージョンに切り替え
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# 作業ディレクトリをリポジトリルート相当に設定
WORKDIR /app

# 依存関係ファイルを先にコピーしてレイヤーキャッシュを活用
# （pnpm-lock.yaml と pnpm-workspace.yaml はリポジトリルートに存在する）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json

# 依存パッケージをインストール
RUN pnpm install --frozen-lockfile

# アプリケーションソースをコピー
COPY apps/web/ ./apps/web/

# ビルド時引数: Vite が静的バンドルに埋め込む環境変数
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_AUTH_WEB_URL
ENV VITE_AUTH_WEB_URL=$VITE_AUTH_WEB_URL

# ワークスペースフィルターでフロントエンドをビルド
RUN pnpm --filter web build

# ─────────────────────────────────────────────
# ステージ 2: nginx による静的ファイル配信
# ─────────────────────────────────────────────
FROM nginx:alpine

# ビルド成果物を nginx の公開ディレクトリにコピー
COPY --from=builder /app/apps/web/dist/ /usr/share/nginx/html/

# SPA ルーティングとポート 3001 リッスンのための nginx 設定
# （ビルドコンテキストがリポジトリルートでない構成でも効くよう、ビルダーから取得する）
COPY --from=builder /app/apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# 使用ポートを宣言
EXPOSE 3001
