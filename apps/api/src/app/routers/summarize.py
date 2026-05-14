"""文章要約ツール向けの HTTP エンドポイント。"""

from fastapi import APIRouter, Depends, HTTPException
from google import genai
from google.genai import errors as genai_errors

from app.core.settings import settings
from app.dependencies.auth import get_current_user
from app.schemas.auth import AuthenticatedUser
from app.schemas.summarize import SummarizeRequest, SummarizeResponse

router = APIRouter(prefix="/tools", tags=["tools"])


def _build_prompt(text: str, length: str) -> str:
    length_guide = {
        "short": "要約は日本語で、全体を 1〜2 文に収めてください。",
        "medium": "要約は日本語で、おおよそ 3〜5 文で説明してください。",
        "long": "要約は日本語で、おおよそ 7〜10 文で説明してください。",
    }[length]
    return (
        "次の文章を要約してください。\n"
        f"{length_guide}\n\n"
        "【本文】\n"
        f"{text}"
    )


@router.post("/summarize")
def post_summarize(
    body: SummarizeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> SummarizeResponse:
    """Google Gemini で入力テキストの要約を返す。"""
    del current_user
    prompt = _build_prompt(body.text, body.length)
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
        )
    except genai_errors.ClientError as e:
        if e.code == 429:
            raise HTTPException(
                status_code=429,
                detail="Gemini API の利用上限に達しました。しばらく待ってから再度お試しください。",
            ) from None
        raise HTTPException(
            status_code=502,
            detail="Gemini API の呼び出しに失敗しました",
        ) from None
    except genai_errors.ServerError:
        raise HTTPException(
            status_code=502,
            detail="Gemini API の呼び出しに失敗しました",
        ) from None
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Gemini API の呼び出しに失敗しました",
        ) from None

    summary_text = (getattr(response, "text", None) or "").strip()
    if not summary_text:
        raise HTTPException(
            status_code=502,
            detail="Gemini API の呼び出しに失敗しました",
        )

    return SummarizeResponse(summary=summary_text)
