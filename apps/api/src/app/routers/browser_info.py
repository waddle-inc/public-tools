"""ブラウザ情報ツール向けの HTTP エンドポイント。"""

from fastapi import APIRouter, Depends, Request

from app.dependencies.auth import get_current_user
from app.schemas.auth import AuthenticatedUser
from app.schemas.browser_info import BrowserInfoResponse

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("/browser-info", response_model=BrowserInfoResponse)
def get_browser_info(
    request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> BrowserInfoResponse:
    """サーバーから見たクライアント IP を返す。"""
    del current_user

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip() or None
        return BrowserInfoResponse(client_ip=client_ip)

    client_host = request.client.host if request.client else None
    return BrowserInfoResponse(client_ip=client_host)
