def test_register_success(client):
    resp = client.post(
        "/auth/register", json={"username": "alice", "password": "password123"}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["username"] == "alice"
    assert isinstance(body["id"], int)
    assert "password" not in body


def test_register_duplicate_returns_409(client):
    client.post("/auth/register", json={"username": "bob", "password": "password123"})
    resp = client.post(
        "/auth/register", json={"username": "bob", "password": "password123"}
    )
    assert resp.status_code == 409


def test_register_username_too_short(client):
    resp = client.post(
        "/auth/register", json={"username": "ab", "password": "password123"}
    )
    assert resp.status_code == 422


def test_register_username_too_long(client):
    resp = client.post(
        "/auth/register", json={"username": "a" * 31, "password": "password123"}
    )
    assert resp.status_code == 422


def test_register_username_invalid_chars(client):
    resp = client.post(
        "/auth/register", json={"username": "has space", "password": "password123"}
    )
    assert resp.status_code == 422


def test_register_username_underscore_allowed(client):
    resp = client.post(
        "/auth/register", json={"username": "a_b_3", "password": "password123"}
    )
    assert resp.status_code == 201


def test_register_password_too_short(client):
    resp = client.post(
        "/auth/register", json={"username": "alice", "password": "short"}
    )
    assert resp.status_code == 422


def test_register_missing_field(client):
    resp = client.post("/auth/register", json={"username": "alice"})
    assert resp.status_code == 422


def test_login_success(client):
    client.post("/auth/register", json={"username": "alice", "password": "password123"})
    resp = client.post(
        "/auth/login", json={"username": "alice", "password": "password123"}
    )
    assert resp.status_code == 200
    assert isinstance(resp.json()["token"], str)


def test_login_wrong_password(client):
    client.post("/auth/register", json={"username": "alice", "password": "password123"})
    resp = client.post(
        "/auth/login", json={"username": "alice", "password": "wrongpass1"}
    )
    assert resp.status_code == 401


def test_login_unknown_user(client):
    resp = client.post(
        "/auth/login", json={"username": "ghost", "password": "password123"}
    )
    assert resp.status_code == 401


def test_todos_require_auth(client):
    assert client.get("/todos").status_code == 401


def test_todos_invalid_token(client):
    resp = client.get("/todos", headers={"Authorization": "Bearer nope"})
    assert resp.status_code == 401


def test_todos_malformed_header(client):
    resp = client.get("/todos", headers={"Authorization": "Token abc"})
    assert resp.status_code == 401


def test_unauth_takes_precedence_over_body_validation(client):
    # Bad body AND no auth -> auth checked first -> 401.
    resp = client.post("/todos", json={"title": ""})
    assert resp.status_code == 401
