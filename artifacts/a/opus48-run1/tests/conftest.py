import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import store


@pytest.fixture(autouse=True)
def _clean_store():
    """Start every test from an empty in-memory store."""
    store.reset()
    yield
    store.reset()


@pytest.fixture
def client():
    return TestClient(app)


def _register(client, username="alice", password="password123"):
    resp = client.post(
        "/auth/register", json={"username": username, "password": password}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _login(client, username="alice", password="password123"):
    resp = client.post(
        "/auth/login", json={"username": username, "password": password}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["token"]


@pytest.fixture
def auth(client):
    """Return a helper that registers + logs in a user and yields auth headers."""

    def _make(username="alice", password="password123"):
        _register(client, username, password)
        token = _login(client, username, password)
        return {"Authorization": f"Bearer {token}"}

    return _make
