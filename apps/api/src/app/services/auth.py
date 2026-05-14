"""
認証に関わるサービス処理。外部認証サービスへのクライアントとスキーマを組み合わせ、API が返すべき形にまとめる。
"""

from app.clients import auth_api
from app.schemas.auth import AuthenticatedUser, SsoVerifyResponse


async def verify_sso_code(code: str) -> SsoVerifyResponse:
    """SSO コードを外部の認証サービス側で検証し、レスポンス用モデルを組み立てる。

    引数:
        code: 認証 Web が払い出した SSO 認可コード。

    戻り値:
        SsoVerifyResponse: API で返却する accessToken とユーザー情報。
    """
    data = await auth_api.exchange_verify(code)
    # 外部サービスのレスポンスを生成型で受け取り、API スキーマへ明示的にマッピングする。
    return SsoVerifyResponse(
        accessToken=data.accessToken,
        user=AuthenticatedUser.model_validate(data.user.model_dump()),
    )
