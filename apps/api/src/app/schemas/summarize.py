"""文章要約ツール向けのリクエスト・レスポンススキーマ。"""

from typing import Literal

from pydantic import BaseModel, Field


class SummarizeRequest(BaseModel):
    """`POST /tools/summarize` のリクエストボディ。"""

    text: str = Field(min_length=1, max_length=10000)
    length: Literal["short", "medium", "long"] = "medium"


class SummarizeResponse(BaseModel):
    """`POST /tools/summarize` のレスポンスボディ。"""

    summary: str
