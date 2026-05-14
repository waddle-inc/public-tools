"""認証 API（別サービス）への HTTP 呼び出し。"""

import httpx
from fastapi import HTTPException, status

from app.core.settings import settings
from app.schemas.auth_api_generated import VerifyExchangeResponseDto


async def exchange_verify(code: str) -> VerifyExchangeResponseDto:
    """認証 API（別サービス）の SSO コード検証エンドポイントを呼び、レスポンスモデルを返す。

    引数:
        code: 認証 Web が発行した SSO 認可コード。

    戻り値:
        VerifyExchangeResponseDto: accessToken と user を含む認証 API のレスポンス。
    """
    try:
        async with httpx.AsyncClient(
            # 上流障害でハングしないよう、外部通信は設定値のタイムアウトを必ず適用する。
            timeout=settings.AUTH_API_TIMEOUT_SECONDS,
        ) as client:
            response = await client.post(
                f"{settings.AUTH_API_URL}/auth/exchange/verify",
                json={"code": code},
            )
    except httpx.RequestError as exc:
        # 接続失敗・DNS 失敗など通信レイヤーの例外は、API 境界で 500 に正規化する。
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal Server Error",
        ) from exc

    if response.status_code == status.HTTP_401_UNAUTHORIZED:
        # SSO コードの不正・期限切れは呼び出し元がハンドリングできるよう 401 を明示する。
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="SSO 認可コードが無効または期限切れです",
        )

    if not response.is_success:
        # 上流の想定外失敗詳細は露出せず、内部エラーとして扱う。
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal Server Error",
        )

    return VerifyExchangeResponseDto.model_validate(response.json())
