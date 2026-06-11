import pytest
from fastapi.testclient import TestClient

from app.main import app, reset_state


@pytest.fixture()
def client():
    reset_state()
    with TestClient(app) as c:
        yield c


def register_and_login(client: TestClient, username: str = "alice", password: str = "password123") -> dict:
    """ユーザーを登録してログインし、Authorization ヘッダを返す。"""
    res = client.post("/auth/register", json={"username": username, "password": password})
    assert res.status_code == 201
    res = client.post("/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['token']}"}


@pytest.fixture()
def auth(client):
    return register_and_login(client)
