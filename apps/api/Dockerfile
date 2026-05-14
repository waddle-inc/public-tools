# syntax=docker/dockerfile:1
# ベースイメージ: Python 3.11 slim
FROM python:3.11-slim

# uv バイナリを公式イメージからコピー
COPY --from=ghcr.io/astral-sh/uv:0.11.7 /uv /usr/local/bin/uv

# 作業ディレクトリを設定
WORKDIR /app

# 依存関係ファイルを先にコピーしてレイヤーキャッシュを活用
COPY pyproject.toml uv.lock ./

# 本番依存のみインストール（dev グループを除外）
RUN uv sync --frozen --no-dev

# アプリケーションコードをコピー
COPY src/ ./src/

# venv の bin を PATH に追加して uvicorn を直接呼び出せるようにする
ENV PATH="/app/.venv/bin:$PATH"

# 使用ポートを宣言
EXPOSE 8001

# アプリケーション起動コマンド
CMD ["uvicorn", "--app-dir", "src", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
