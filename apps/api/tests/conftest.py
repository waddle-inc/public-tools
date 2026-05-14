"""ルートレベル試験で共有する環境と TestClient。"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(autouse=True)
def set_env(monkeypatch):
    """認証・JWT 関連の環境変数を試験用に固定する。"""
    monkeypatch.setenv("AUTH_API_URL", "http://auth-api.example.com")
    monkeypatch.setenv("TOOLS_JWT_AUDIENCE", "tools")
    monkeypatch.setenv("JWT_SECRET", "test-secret-key-32-bytes-minimum!!")
    monkeypatch.setenv("GEMINI_API_KEY", "dummy-gemini-key")


@pytest.fixture
def client(set_env):
    """アプリ全体に対する TestClient。"""
    from app.main import app

    return TestClient(app)
