"""
GET /tools/download-speed/chunk の認証・バリデーション・本文を検証する。
"""

import time

import jwt

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


class TestDownloadSpeedChunk:
    """GET `/tools/download-speed/chunk` の試験。"""

    def test_authenticated_returns_octet_stream(self, client):
        """認証済みで size_mb=1 のとき 200 と指定バイト数のバイナリが返る。"""
        token = make_access_token()
        response = client.get(
            "/tools/download-speed/chunk",
            params={"size_mb": 1},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        assert response.headers["content-type"].startswith("application/octet-stream")
        assert response.headers.get("content-length") == str(1 * 1024 * 1024)
        assert len(response.content) == 1 * 1024 * 1024

    def test_size_mb_out_of_range_returns_422(self, client):
        """size_mb が上限を超えるとバリデーションエラーとなる。"""
        token = make_access_token()
        response = client.get(
            "/tools/download-speed/chunk",
            params={"size_mb": 101},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 422

    def test_unauthenticated_returns_401(self, client):
        """未認証のとき 401 となる。"""
        response = client.get("/tools/download-speed/chunk", params={"size_mb": 1})

        assert response.status_code == 401
