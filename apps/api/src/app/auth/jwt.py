"""アクセストークン JWT の検証と情報取得。"""

import jwt
from fastapi import HTTPException, status

from app.core.settings import settings
from app.schemas.auth import AuthenticatedUser


def verify_access_token(token: str) -> AuthenticatedUser:
    """JWT を検証し、結果を `AuthenticatedUser` にマッピングする。

    引数:
        token: Authorization ヘッダーから取得したアクセストークン。

    戻り値:
        AuthenticatedUser: JWT のクレームから復元したユーザー情報。
    """
    try:
        payload: dict = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
            audience=settings.TOOLS_JWT_AUDIENCE,
        )
    except jwt.InvalidAudienceError:
        # audience 不一致は権限スコープ不正として 403 を返す。
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    sub: str | None = payload.get("sub")
    email: str | None = payload.get("email")
    roles: list[str] = payload.get("roles", [])

    if not sub or not email:
        # 必須クレーム欠落トークンは不正として 401 を返す。
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized",
        )

    return AuthenticatedUser(id=sub, email=email, roles=roles)
