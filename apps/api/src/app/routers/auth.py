"""
認証向け HTTP エンドポイント。

SSO コード検証や、認証済みユーザーの情報取得を提供する。
"""

from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user
from app.schemas.auth import AuthenticatedUser, MeResponse, SsoVerifyRequest, SsoVerifyResponse
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/sso/verify", response_model=SsoVerifyResponse)
async def sso_verify(body: SsoVerifyRequest) -> SsoVerifyResponse:
    """SSO が発行したコードを検証し、結果を返す。"""
    return await auth_service.verify_sso_code(body.code)


@router.get("/me", response_model=MeResponse)
def auth_me(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> MeResponse:
    """アクセストークンから取得した、現在ログイン中のユーザー情報を返す。"""
    return MeResponse(user=current_user)
