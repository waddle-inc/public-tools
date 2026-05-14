"""ブラウザ情報ツール向けのレスポンススキーマ。"""

from pydantic import BaseModel


class BrowserInfoResponse(BaseModel):
    """サーバーから見たクライアント情報。"""

    client_ip: str | None
