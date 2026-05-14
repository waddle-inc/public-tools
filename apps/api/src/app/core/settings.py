"""環境変数から読み込む設定と、CORS 許可用オリジンの解釈。"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """ツール API の実行設定（`.env` と環境変数）。"""

    AUTH_API_URL: str
    TOOLS_JWT_AUDIENCE: str
    JWT_SECRET: str
    AUTH_API_TIMEOUT_SECONDS: float = 10.0
    # カンマ区切りのオリジン。'*' は開発用の全許可（allow_credentials 時は非推奨）
    CORS_ALLOW_ORIGINS: str = "http://localhost:3001,http://127.0.0.1:3001"
    GEMINI_API_KEY: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()


def get_cors_allow_origins() -> list[str]:
    """CORS で許可するオリジンのリスト（環境変数 CORS_ALLOW_ORIGINS から解釈）"""
    raw = settings.CORS_ALLOW_ORIGINS.strip()
    if raw == "*":
        return ["*"]
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if not origins:
        msg = (
            "CORS_ALLOW_ORIGINS が空です。"
            "'*' またはカンマ区切りのオリジン（例: https://app.example.com）を設定してください。"
        )
        raise ValueError(msg)
    return origins
