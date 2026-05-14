"""
認証関連のリクエスト・レスポンス用 Pydantic モデル。
"""

from pydantic import BaseModel, Field


class AuthenticatedUser(BaseModel):
    """ログイン済みユーザーとして公開する情報。"""

    id: str
    email: str
    roles: list[str]


class SsoVerifyRequest(BaseModel):
    """`/auth/sso/verify` に送るリクエストボディ。"""

    code: str = Field(..., min_length=1)


class SsoVerifyResponse(BaseModel):
    """`/auth/sso/verify` のレスポンス。"""

    accessToken: str
    user: AuthenticatedUser


class MeResponse(BaseModel):
    """`/auth/me` のレスポンス。"""

    user: AuthenticatedUser
