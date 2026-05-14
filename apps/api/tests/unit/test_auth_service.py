"""
`services.auth.verify_sso_code` の振る舞いと、上流呼び出しの連携を検証する。
"""

import pytest
from fastapi import HTTPException


@pytest.fixture(autouse=True)
def patch_settings(monkeypatch):
    """試験用の環境変数を固定する。"""
    monkeypatch.setenv("AUTH_API_URL", "http://auth-api.example.com")
    monkeypatch.setenv("TOOLS_JWT_AUDIENCE", "tools")
    monkeypatch.setenv("JWT_SECRET", "test-secret-key-32-bytes-minimum!!")


@pytest.fixture
def mock_exchange_verify(mocker):
    """clients.auth_api.exchange_verify をスタブする。"""
    return mocker.patch("app.clients.auth_api.exchange_verify")


async def test_verify_sso_code_success(mock_exchange_verify):
    """上流が成功 JSON を返すとき、モデルへ変換して返す。"""
    from app.schemas.auth_api_generated import ExchangeUserDto, VerifyExchangeResponseDto
    from app.services.auth import verify_sso_code

    mock_exchange_verify.return_value = VerifyExchangeResponseDto(
        accessToken="token-abc",
        user=ExchangeUserDto(id="user-1", email="user@example.com", roles=["customer"]),
    )

    result = await verify_sso_code("valid-code")

    mock_exchange_verify.assert_called_once_with("valid-code")
    assert result.accessToken == "token-abc"
    assert result.user.id == "user-1"
    assert result.user.email == "user@example.com"
    assert result.user.roles == ["customer"]


async def test_verify_sso_code_unauthorized(mock_exchange_verify):
    """上流が 401 のとき、その例外がそのまま上がる。"""
    from app.services.auth import verify_sso_code

    mock_exchange_verify.side_effect = HTTPException(status_code=401, detail="SSO 認可コードが無効または期限切れです")

    with pytest.raises(HTTPException) as exc_info:
        await verify_sso_code("invalid-code")

    assert exc_info.value.status_code == 401


async def test_verify_sso_code_server_error(mock_exchange_verify):
    """上流がサーバエラーを返すとき、その例外がそのまま上がる。"""
    from app.services.auth import verify_sso_code

    mock_exchange_verify.side_effect = HTTPException(status_code=500, detail="Internal Server Error")

    with pytest.raises(HTTPException) as exc_info:
        await verify_sso_code("code")

    assert exc_info.value.status_code == 500
