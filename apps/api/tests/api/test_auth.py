"""
TestClient 経由で認証ルートの応答コードと JSON を検証する。
"""

import time

import jwt
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

SECRET = "test-secret-key-32-bytes-minimum!!"
AUDIENCE = "tools"


@pytest.fixture(autouse=True)
def patch_settings(monkeypatch):
    """本ファイル試験用の環境変数を固定する。"""
    monkeypatch.setenv("AUTH_API_URL", "http://auth-api.example.com")
    monkeypatch.setenv("TOOLS_JWT_AUDIENCE", AUDIENCE)
    monkeypatch.setenv("JWT_SECRET", SECRET)
    monkeypatch.setenv("GEMINI_API_KEY", "dummy-gemini-key")


@pytest.fixture
def client(patch_settings):
    """FastAPI アプリの TestClient。"""
    from app.main import app

    return TestClient(app)


@pytest.fixture
def mock_exchange_verify(mocker):
    """上流の exchange_verify をスタブする。"""
    return mocker.patch("app.clients.auth_api.exchange_verify")


def make_access_token(sub="user-1", email="user@example.com", roles=None, aud=AUDIENCE, exp_offset=900):
    """試験用の HS256 アクセストークンを組み立てる。"""
    if roles is None:
        roles = ["customer"]
    payload = {
        "sub": sub,
        "email": email,
        "roles": roles,
        "aud": aud,
        "exp": int(time.time()) + exp_offset,
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


# POST /auth/sso/verify


class TestSsoVerify:
    """POST `/auth/sso/verify` の入力・上流応答別の試験。"""

    def test_valid_code_returns_token_and_user(self, client, mock_exchange_verify):
        """上流が正常なとき、トークンとユーザー情報を返す。"""
        from app.schemas.auth_api_generated import ExchangeUserDto, VerifyExchangeResponseDto

        mock_exchange_verify.return_value = VerifyExchangeResponseDto(
            accessToken="access-token-xyz",
            user=ExchangeUserDto(id="user-1", email="user@example.com", roles=["customer"]),
        )

        response = client.post("/auth/sso/verify", json={"code": "valid-code"})

        assert response.status_code == 200
        data = response.json()
        assert data["accessToken"] == "access-token-xyz"
        assert data["user"]["id"] == "user-1"
        assert data["user"]["email"] == "user@example.com"

    def test_empty_code_returns_400(self, client):
        """空の code はスキーマ上不正として拒否される。"""
        response = client.post("/auth/sso/verify", json={"code": ""})
        assert response.status_code == 422

    def test_missing_code_returns_400(self, client):
        """code が欠けるとバリデーションエラーとなる。"""
        response = client.post("/auth/sso/verify", json={})
        assert response.status_code == 422

    def test_auth_api_returns_401(self, client, mock_exchange_verify):
        """上流が 401 としたとき、そのまま伝播する。"""
        mock_exchange_verify.side_effect = HTTPException(
            status_code=401,
            detail="SSO 認可コードが無効または期限切れです",
        )

        response = client.post("/auth/sso/verify", json={"code": "bad-code"})

        assert response.status_code == 401

    def test_auth_api_connection_error(self, client, mock_exchange_verify):
        """上流が 500 を返すとき、クライアントにも 500 が返る。"""
        mock_exchange_verify.side_effect = HTTPException(
            status_code=500,
            detail="Internal Server Error",
        )

        response = client.post("/auth/sso/verify", json={"code": "code"})

        assert response.status_code == 500


# GET /auth/me


class TestAuthMe:
    """GET `/auth/me` のヘッダとトークン別の試験。"""

    def test_valid_token_returns_user(self, client):
        """有効な Bearer のとき、`user` が返る。"""
        token = make_access_token()

        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        data = response.json()
        assert data["user"]["id"] == "user-1"
        assert data["user"]["email"] == "user@example.com"

    def test_no_authorization_header_returns_401(self, client):
        """Authorization が無いと未認可となる。"""
        response = client.get("/auth/me")
        assert response.status_code == 401

    def test_non_bearer_token_returns_401(self, client):
        """Bearer 以外は未認可として扱う。"""
        response = client.get("/auth/me", headers={"Authorization": "Basic sometoken"})
        assert response.status_code == 401

    def test_expired_token_returns_401(self, client):
        """期限切れトークンは未認可となる。"""
        token = make_access_token(exp_offset=-1)

        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 401

    def test_wrong_audience_returns_403(self, client):
        """aud が期待と異なると禁止となる。"""
        token = make_access_token(aud="other-service")

        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 403
