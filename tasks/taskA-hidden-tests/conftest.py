"""隠し受け入れテスト用フィクスチャ。

実行前提: 被テスト実装が http://127.0.0.1:8000 で起動済みであること。
各テストは uuid で一意なユーザーを作るため、サーバ状態のリセットは不要。
"""
import uuid

import httpx
import pytest

BASE_URL = "http://127.0.0.1:8000"


@pytest.fixture
def client():
    with httpx.Client(base_url=BASE_URL, timeout=10) as c:
        yield c


def register_and_login(client: httpx.Client) -> tuple[str, dict]:
    """一意なユーザーを作成してログインし、(username, auth_headers) を返す。"""
    username = "u_" + uuid.uuid4().hex[:16]
    password = "password123"
    r = client.post("/auth/register", json={"username": username, "password": password})
    assert r.status_code == 201, f"register failed: {r.status_code} {r.text}"
    r = client.post("/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    token = r.json()["token"]
    return username, {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth(client):
    """デフォルトユーザーの認証ヘッダ。"""
    _, headers = register_and_login(client)
    return headers
