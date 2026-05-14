"""
ツールサービス API（バックエンド）のエントリーポイント。

FastAPI インスタンスの生成、CORS、認証関連ルーターの取り込み、
`/health` による生存確認をまとめる。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.settings import get_cors_allow_origins
from app.routers import auth, browser_info, download_speed, summarize

app = FastAPI(title="ツールサービス API（バックエンド）")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_allow_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(browser_info.router)
app.include_router(download_speed.router)
app.include_router(summarize.router)


@app.get("/health")
def health_check() -> dict:
    """API の生存確認に用いる簡易エンドポイント。"""
    return {"status": "ok"}
