"""ASGI で `app.main:app` を公開する、この API プロジェクトのエントリー。"""

from app.main import app

__all__ = ["app"]
