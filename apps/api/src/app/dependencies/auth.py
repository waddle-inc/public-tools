"""
FastAPI Depends 用の認証依存関数。

Bearer トークンからユーザー情報を取得する。
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.jwt import verify_access_token
from app.schemas.auth import AuthenticatedUser

_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> AuthenticatedUser:
    """Authorization Bearer を検証し、ログインユーザー情報を返す。

    戻り値:
        AuthenticatedUser: 検証済みトークンから復元したユーザー情報。
    """
    if credentials is None:
        # 認証ヘッダー未指定は未認証として 401 を返し、下流処理へ進ませない。
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )
    return verify_access_token(credentials.credentials)
