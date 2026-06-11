"""認証 (/auth/register, /auth/login) のテスト。"""

import pytest

from tests.conftest import register_and_login


class TestRegister:
    def test_register_success(self, client):
        res = client.post("/auth/register", json={"username": "alice", "password": "password123"})
        assert res.status_code == 201
        body = res.json()
        assert body == {"id": body["id"], "username": "alice"}
        assert isinstance(body["id"], int)

    def test_register_duplicate_username(self, client):
        client.post("/auth/register", json={"username": "alice", "password": "password123"})
        res = client.post("/auth/register", json={"username": "alice", "password": "otherpass456"})
        assert res.status_code == 409

    @pytest.mark.parametrize("username", [
        "ab",                # 2文字(短すぎ)
        "a" * 31,            # 31文字(長すぎ)
        "user name",         # 空白
        "ユーザー名前",        # 非ASCII
        "user-name",         # ハイフン
        "user!",             # 記号
        "",                  # 空
    ])
    def test_register_invalid_username(self, client, username):
        res = client.post("/auth/register", json={"username": username, "password": "password123"})
        assert res.status_code == 422

    @pytest.mark.parametrize("username", ["abc", "a" * 30, "user_name_1", "___", "ABC123"])
    def test_register_valid_username(self, client, username):
        res = client.post("/auth/register", json={"username": username, "password": "password123"})
        assert res.status_code == 201

    def test_register_short_password(self, client):
        res = client.post("/auth/register", json={"username": "alice", "password": "1234567"})
        assert res.status_code == 422

    def test_register_exactly_8_char_password(self, client):
        res = client.post("/auth/register", json={"username": "alice", "password": "12345678"})
        assert res.status_code == 201

    def test_register_missing_fields(self, client):
        assert client.post("/auth/register", json={"username": "alice"}).status_code == 422
        assert client.post("/auth/register", json={"password": "password123"}).status_code == 422
        assert client.post("/auth/register", json={}).status_code == 422

    def test_register_wrong_types(self, client):
        res = client.post("/auth/register", json={"username": 123, "password": "password123"})
        assert res.status_code == 422


class TestLogin:
    def test_login_success(self, client):
        client.post("/auth/register", json={"username": "alice", "password": "password123"})
        res = client.post("/auth/login", json={"username": "alice", "password": "password123"})
        assert res.status_code == 200
        token = res.json()["token"]
        assert isinstance(token, str) and len(token) > 0

    def test_login_wrong_password(self, client):
        client.post("/auth/register", json={"username": "alice", "password": "password123"})
        res = client.post("/auth/login", json={"username": "alice", "password": "wrongpass1"})
        assert res.status_code == 401

    def test_login_unknown_user(self, client):
        res = client.post("/auth/login", json={"username": "nobody", "password": "password123"})
        assert res.status_code == 401


class TestBearerAuth:
    def test_todos_require_auth_header(self, client):
        assert client.get("/todos").status_code == 401
        assert client.post("/todos", json={"title": "x"}).status_code == 401
        assert client.get("/todos/1").status_code == 401
        assert client.patch("/todos/1", json={}).status_code == 401
        assert client.delete("/todos/1").status_code == 401

    def test_invalid_token(self, client):
        res = client.get("/todos", headers={"Authorization": "Bearer invalid-token"})
        assert res.status_code == 401

    def test_non_bearer_scheme(self, client):
        register_and_login(client)
        res = client.get("/todos", headers={"Authorization": "Basic abcdef"})
        assert res.status_code == 401

    def test_valid_token_works(self, client, auth):
        res = client.get("/todos", headers=auth)
        assert res.status_code == 200
