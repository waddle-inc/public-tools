"""
POST /tools/summarize の認証・バリデーション・Gemini 連携を検証する。
"""

import time

import jwt
from google.genai.errors import ClientError

SECRET = "test-secret-key-32-bytes-minimum!!"
AUDIENCE = "tools"


def make_access_token(sub="user-1", email="user@example.com", roles=None, aud=AUDIENCE, exp_offset=900):
    """試験用の HS256 アクセストークンを組み立てる。"""
    if roles is None:
        roles = ["customer"]
    payload = {
        "sub": sub,
        "email": email,
        "roles": roles,
        "aud": aud,
        "exp": int(time.time()) + exp_offset,
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


class TestSummarize:
    """`POST /tools/summarize` の試験。"""

    def test_authenticated_returns_summary(self, client, mocker):
        """認証済み・正常なリクエストで 200 と summary が返る。"""
        mock_inst = mocker.MagicMock()
        mock_inst.models.generate_content.return_value = mocker.MagicMock(
            text="これは要約です。",
        )
        mocker.patch("app.routers.summarize.genai.Client", return_value=mock_inst)

        token = make_access_token()
        response = client.post(
            "/tools/summarize",
            headers={"Authorization": f"Bearer {token}"},
            json={"text": "長い本文の例です。", "length": "medium"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["summary"] == "これは要約です。"

    def test_unauthenticated_returns_401(self, client):
        """未認証のとき 401 となる。"""
        response = client.post(
            "/tools/summarize",
            json={"text": "本文", "length": "medium"},
        )

        assert response.status_code == 401

    def test_empty_text_returns_422(self, client):
        """text が空文字のとき 422 となる。"""
        token = make_access_token()
        response = client.post(
            "/tools/summarize",
            headers={"Authorization": f"Bearer {token}"},
            json={"text": "", "length": "medium"},
        )

        assert response.status_code == 422

    def test_text_too_long_returns_422(self, client):
        """text が 10001 文字のとき 422 となる。"""
        token = make_access_token()
        response = client.post(
            "/tools/summarize",
            headers={"Authorization": f"Bearer {token}"},
            json={"text": "a" * 10001, "length": "medium"},
        )

        assert response.status_code == 422

    def test_invalid_length_returns_422(self, client):
        """length に無効な値のとき 422 となる。"""
        token = make_access_token()
        response = client.post(
            "/tools/summarize",
            headers={"Authorization": f"Bearer {token}"},
            json={"text": "本文", "length": "invalid"},
        )

        assert response.status_code == 422

    def test_gemini_error_returns_502(self, client, mocker):
        """Gemini API が例外を投げたとき 502 となる。"""
        mock_inst = mocker.MagicMock()
        mock_inst.models.generate_content.side_effect = RuntimeError("API error")
        mocker.patch("app.routers.summarize.genai.Client", return_value=mock_inst)

        token = make_access_token()
        response = client.post(
            "/tools/summarize",
            headers={"Authorization": f"Bearer {token}"},
            json={"text": "本文", "length": "medium"},
        )

        assert response.status_code == 502

    def test_gemini_rate_limit_returns_429(self, client, mocker):
        """Gemini API が 429（クォータ超過）のとき 429 となる。"""
        quota_error = ClientError(
            429,
            {
                "error": {
                    "code": 429,
                    "message": "RESOURCE_EXHAUSTED",
                    "status": "RESOURCE_EXHAUSTED",
                }
            },
            None,
        )
        mock_inst = mocker.MagicMock()
        mock_inst.models.generate_content.side_effect = quota_error
        mocker.patch("app.routers.summarize.genai.Client", return_value=mock_inst)

        token = make_access_token()
        response = client.post(
            "/tools/summarize",
            headers={"Authorization": f"Bearer {token}"},
            json={"text": "本文", "length": "medium"},
        )

        assert response.status_code == 429
        assert "利用上限" in response.json()["detail"]
