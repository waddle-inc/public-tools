"""ダウンロード速度測定ツール向けの HTTP エンドポイント。"""

import os

from fastapi import APIRouter, Depends, Query, Response

from app.dependencies.auth import get_current_user
from app.schemas.auth import AuthenticatedUser

router = APIRouter(prefix="/tools", tags=["tools"])


@router.get("/download-speed/chunk")
def get_download_chunk(
    size_mb: int = Query(default=10, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> Response:
    """指定サイズのランダムバイト列を octet-stream で返す。"""
    del current_user

    byte_count = size_mb * 1024 * 1024
    data = os.urandom(byte_count)
    headers = {"Content-Length": str(len(data))}
    return Response(
        content=data,
        media_type="application/octet-stream",
        headers=headers,
    )
