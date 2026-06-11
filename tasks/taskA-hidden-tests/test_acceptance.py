"""Tasklet 隠し受け入れテスト(モデルには見せない)。

採点: 合格テスト数 / 全テスト数 を品質スコアとして記録する。
"""
import uuid

from conftest import register_and_login


# ---------------------------------------------------------------- auth

def test_register_duplicate_username_409(client):
    username = "u_" + uuid.uuid4().hex[:16]
    body = {"username": username, "password": "password123"}
    assert client.post("/auth/register", json=body).status_code == 201
    assert client.post("/auth/register", json=body).status_code == 409


def test_register_short_password_422(client):
    username = "u_" + uuid.uuid4().hex[:16]
    r = client.post("/auth/register", json={"username": username, "password": "short"})
    assert r.status_code == 422


def test_register_invalid_username_chars_422(client):
    r = client.post("/auth/register", json={"username": "ab", "password": "password123"})
    assert r.status_code == 422  # 2文字(3未満)
    r = client.post("/auth/register", json={"username": "user name!", "password": "password123"})
    assert r.status_code == 422  # 記号・空白


def test_login_wrong_password_401(client):
    username = "u_" + uuid.uuid4().hex[:16]
    client.post("/auth/register", json={"username": username, "password": "password123"})
    r = client.post("/auth/login", json={"username": username, "password": "wrongpass1"})
    assert r.status_code == 401


def test_todos_without_token_401(client):
    assert client.get("/todos").status_code == 401


def test_todos_invalid_token_401(client):
    r = client.get("/todos", headers={"Authorization": "Bearer not-a-real-token"})
    assert r.status_code == 401


# ---------------------------------------------------------------- create

def test_create_minimal_todo_201(client, auth):
    r = client.post("/todos", json={"title": "牛乳を買う"}, headers=auth)
    assert r.status_code == 201
    body = r.json()
    assert body["title"] == "牛乳を買う"
    assert body["status"] == "open"


def test_create_whitespace_only_title_422(client, auth):
    r = client.post("/todos", json={"title": "   "}, headers=auth)
    assert r.status_code == 422


def test_create_title_is_trimmed(client, auth):
    r = client.post("/todos", json={"title": "  trim me  "}, headers=auth)
    assert r.status_code == 201
    assert r.json()["title"] == "trim me"


def test_create_tags_lowercased_and_deduped(client, auth):
    r = client.post(
        "/todos",
        json={"title": "tags", "tags": ["Work", "work", "URGENT"]},
        headers=auth,
    )
    assert r.status_code == 201
    assert sorted(r.json()["tags"]) == ["urgent", "work"]


def test_create_more_than_10_tags_422(client, auth):
    tags = [f"tag{i}" for i in range(11)]
    r = client.post("/todos", json={"title": "many tags", "tags": tags}, headers=auth)
    assert r.status_code == 422


def test_create_invalid_due_date_422(client, auth):
    r = client.post("/todos", json={"title": "bad date", "due_date": "not-a-date"}, headers=auth)
    assert r.status_code == 422


# ---------------------------------------------------------------- isolation

def test_get_other_users_todo_404(client):
    _, alice = register_and_login(client)
    _, bob = register_and_login(client)
    todo_id = client.post("/todos", json={"title": "alice's"}, headers=alice).json()["id"]
    assert client.get(f"/todos/{todo_id}", headers=bob).status_code == 404


def test_delete_other_users_todo_404(client):
    _, alice = register_and_login(client)
    _, bob = register_and_login(client)
    todo_id = client.post("/todos", json={"title": "alice's"}, headers=alice).json()["id"]
    assert client.delete(f"/todos/{todo_id}", headers=bob).status_code == 404
    # 本人からはまだ見える
    assert client.get(f"/todos/{todo_id}", headers=alice).status_code == 200


def test_list_excludes_other_users_todos(client):
    _, alice = register_and_login(client)
    _, bob = register_and_login(client)
    client.post("/todos", json={"title": "alice only"}, headers=alice)
    items = client.get("/todos", headers=bob).json()["items"]
    assert all(t["title"] != "alice only" for t in items)


# ---------------------------------------------------------------- list / search

def test_search_q_case_insensitive(client, auth):
    client.post("/todos", json={"title": "Buy MILK tomorrow"}, headers=auth)
    client.post("/todos", json={"title": "walk the dog"}, headers=auth)
    r = client.get("/todos", params={"q": "milk"}, headers=auth)
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["title"] == "Buy MILK tomorrow"


def test_filter_by_tag_lowercase_match(client, auth):
    client.post("/todos", json={"title": "tagged", "tags": ["Work"]}, headers=auth)
    client.post("/todos", json={"title": "untagged"}, headers=auth)
    items = client.get("/todos", params={"tag": "work"}, headers=auth).json()["items"]
    assert len(items) == 1
    assert items[0]["title"] == "tagged"


def test_filter_invalid_status_422(client, auth):
    r = client.get("/todos", params={"status": "banana"}, headers=auth)
    assert r.status_code == 422


def test_pagination_total_and_bounds(client, auth):
    for i in range(5):
        client.post("/todos", json={"title": f"todo {i}"}, headers=auth)
    r = client.get("/todos", params={"page": 2, "per_page": 2}, headers=auth)
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 5
    assert body["page"] == 2
    assert body["per_page"] == 2
    assert len(body["items"]) == 2


def test_pagination_page_zero_422(client, auth):
    assert client.get("/todos", params={"page": 0}, headers=auth).status_code == 422


def test_pagination_per_page_over_100_422(client, auth):
    assert client.get("/todos", params={"per_page": 101}, headers=auth).status_code == 422


def test_sort_due_date_asc_nulls_last(client, auth):
    client.post("/todos", json={"title": "no due"}, headers=auth)
    client.post("/todos", json={"title": "late", "due_date": "2026-12-01T00:00:00"}, headers=auth)
    client.post("/todos", json={"title": "early", "due_date": "2026-01-01T00:00:00"}, headers=auth)
    items = client.get("/todos", params={"sort": "due_date_asc"}, headers=auth).json()["items"]
    titles = [t["title"] for t in items]
    assert titles == ["early", "late", "no due"]


def test_sort_invalid_value_422(client, auth):
    assert client.get("/todos", params={"sort": "title_asc"}, headers=auth).status_code == 422


# ---------------------------------------------------------------- update / delete

def test_patch_status_done(client, auth):
    todo_id = client.post("/todos", json={"title": "to finish"}, headers=auth).json()["id"]
    r = client.patch(f"/todos/{todo_id}", json={"status": "done"}, headers=auth)
    assert r.status_code == 200
    assert r.json()["status"] == "done"


def test_patch_invalid_status_422(client, auth):
    todo_id = client.post("/todos", json={"title": "x"}, headers=auth).json()["id"]
    r = client.patch(f"/todos/{todo_id}", json={"status": "finished"}, headers=auth)
    assert r.status_code == 422


def test_patch_partial_update_keeps_other_fields(client, auth):
    todo_id = client.post(
        "/todos",
        json={"title": "original", "description": "keep me", "tags": ["a"]},
        headers=auth,
    ).json()["id"]
    r = client.patch(f"/todos/{todo_id}", json={"title": "renamed"}, headers=auth)
    assert r.status_code == 200
    body = r.json()
    assert body["title"] == "renamed"
    assert body["description"] == "keep me"
    assert body["tags"] == ["a"]


def test_delete_then_404(client, auth):
    todo_id = client.post("/todos", json={"title": "bye"}, headers=auth).json()["id"]
    assert client.delete(f"/todos/{todo_id}", headers=auth).status_code == 204
    assert client.get(f"/todos/{todo_id}", headers=auth).status_code == 404
