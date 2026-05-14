"""
`verify_access_token` の検証結果と異常時の HTTPException を確認する。
"""

import time

import jwt
import pytest
from fastapi import HTTPException

SECRET = "test-secret-key-32-bytes-minimum!!"
AUDIENCE = "tools"


@pytest.fixture(autouse=True)
def patch_settings(monkeypatch):
    """JWT 検証に必要な環境変数を試験用に固定する。"""
    monkeypatch.setenv("JWT_SECRET", SECRET)
    monkeypatch.setenv("TOOLS_JWT_AUDIENCE", AUDIENCE)
    monkeypatch.setenv("AUTH_API_URL", "http://auth-api.example.com")


def make_token(sub="user-1", email="user@example.com", roles=None, aud=AUDIENCE, exp_offset=900):
    """試験用の HS256 トークンを組み立てる。"""
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


def test_verify_valid_token(patch_settings):
    """有効トークンは `AuthenticatedUser` に復元できる。"""
    from app.auth.jwt import verify_access_token

    token = make_token()
    user = verify_access_token(token)

    assert user.id == "user-1"
    assert user.email == "user@example.com"
    assert user.roles == ["customer"]


def test_verify_expired_token(patch_settings):
    """期限切れは未認可扱い。"""
    from app.auth.jwt import verify_access_token

    token = make_token(exp_offset=-1)
    with pytest.raises(HTTPException) as exc_info:
        verify_access_token(token)

    assert exc_info.value.status_code == 401


def test_verify_wrong_audience(patch_settings):
    """aud が合わないと禁止。"""
    from app.auth.jwt import verify_access_token

    token = make_token(aud="other-service")
    with pytest.raises(HTTPException) as exc_info:
        verify_access_token(token)

    assert exc_info.value.status_code == 403


def test_verify_invalid_signature(patch_settings):
    """署名が壊れたトークンは未認可。"""
    from app.auth.jwt import verify_access_token

    token = make_token()
    tampered = token[:-5] + "XXXXX"
    with pytest.raises(HTTPException) as exc_info:
        verify_access_token(tampered)

    assert exc_info.value.status_code == 401
