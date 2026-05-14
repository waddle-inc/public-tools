"""FastAPI アプリを起動せずに OpenAPI スキーマを JSON へ書き出す。"""

import json
import os
import sys
from pathlib import Path

# `uv run python scripts/...` 実行時に `app` を解決できるようにする
_src = Path(__file__).resolve().parent.parent / "src"
if str(_src) not in sys.path:
    sys.path.insert(0, str(_src))


def _ensure_export_env_defaults() -> None:
    """書き出し専用。`.env` に必須キーが無い環境でも `Settings` が初期化できるようにする。"""
    defaults = {
        "AUTH_API_URL": "http://127.0.0.1:65535",
        "TOOLS_JWT_AUDIENCE": "tools",
        "JWT_SECRET": "openapi-export-placeholder-32-bytes-x",
        "GEMINI_API_KEY": "openapi-export-dummy-gemini-key",
    }
    for key, value in defaults.items():
        if not (os.environ.get(key) or "").strip():
            os.environ[key] = value


_ensure_export_env_defaults()

from app.main import app

output = Path(__file__).parent / "../../.." / "docs/api/openapi.json"
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False), encoding="utf-8")
