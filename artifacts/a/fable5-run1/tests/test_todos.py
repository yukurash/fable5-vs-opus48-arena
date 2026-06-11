"""/todos エンドポイント (CRUD・バリデーション・所有権) のテスト。"""

import pytest

from tests.conftest import register_and_login


def create_todo(client, auth, **overrides):
    payload = {"title": "test todo", **overrides}
    res = client.post("/todos", json=payload, headers=auth)
    return res


class TestCreateTodo:
    def test_create_minimal(self, client, auth):
        res = create_todo(client, auth, title="牛乳を買う")
        assert res.status_code == 201
        body = res.json()
        assert body["title"] == "牛乳を買う"
        assert body["description"] is None
        assert body["due_date"] is None
        assert body["tags"] == []
        assert body["status"] == "open"
        assert isinstance(body["id"], int)
        assert isinstance(body["created_at"], str)

    def test_create_full(self, client, auth):
        res = create_todo(
            client, auth,
            title="牛乳を買う",
            description="低脂肪のやつ",
            due_date="2026-07-01T12:00:00",
            tags=["buy", "errand"],
        )
        assert res.status_code == 201
        body = res.json()
        assert body["description"] == "低脂肪のやつ"
        assert body["due_date"] == "2026-07-01T12:00:00"
        assert body["tags"] == ["buy", "errand"]

    def test_title_is_trimmed(self, client, auth):
        res = create_todo(client, auth, title="  hello  ")
        assert res.status_code == 201
        assert res.json()["title"] == "hello"

    @pytest.mark.parametrize("title", ["", "   ", "\t\n", "a" * 101, "  " + "a" * 101 + "  "])
    def test_invalid_title(self, client, auth, title):
        assert create_todo(client, auth, title=title).status_code == 422

    def test_title_100_chars_after_trim_ok(self, client, auth):
        res = create_todo(client, auth, title="  " + "a" * 100 + "  ")
        assert res.status_code == 201
        assert res.json()["title"] == "a" * 100

    def test_missing_title(self, client, auth):
        res = client.post("/todos", json={"description": "no title"}, headers=auth)
        assert res.status_code == 422

    def test_description_max_1000(self, client, auth):
        assert create_todo(client, auth, description="d" * 1000).status_code == 201
        assert create_todo(client, auth, description="d" * 1001).status_code == 422

    def test_invalid_due_date(self, client, auth):
        assert create_todo(client, auth, due_date="not-a-date").status_code == 422
        assert create_todo(client, auth, due_date="2026-13-45T99:99:99").status_code == 422

    def test_past_due_date_allowed(self, client, auth):
        res = create_todo(client, auth, due_date="2000-01-01T00:00:00")
        assert res.status_code == 201
        assert res.json()["due_date"] == "2000-01-01T00:00:00"

    def test_tags_lowercased_and_deduped(self, client, auth):
        res = create_todo(client, auth, tags=["Buy", "BUY", "buy", "Errand"])
        assert res.status_code == 201
        assert res.json()["tags"] == ["buy", "errand"]

    def test_tag_length_limits(self, client, auth):
        assert create_todo(client, auth, tags=[""]).status_code == 422
        assert create_todo(client, auth, tags=["a" * 21]).status_code == 422
        assert create_todo(client, auth, tags=["a", "b" * 20]).status_code == 201

    def test_more_than_10_unique_tags_rejected(self, client, auth):
        tags = [f"tag{i}" for i in range(11)]
        assert create_todo(client, auth, tags=tags).status_code == 422

    def test_10_unique_tags_after_dedupe_ok(self, client, auth):
        # 重複込みで12個だが、重複除去後は10個なので OK
        tags = [f"tag{i}" for i in range(10)] + ["TAG0", "TAG1"]
        res = create_todo(client, auth, tags=tags)
        assert res.status_code == 201
        assert len(res.json()["tags"]) == 10

    def test_status_always_open_on_create(self, client, auth):
        res = client.post("/todos", json={"title": "x", "status": "done"}, headers=auth)
        assert res.status_code == 201
        assert res.json()["status"] == "open"


class TestGetTodo:
    def test_get_own_todo(self, client, auth):
        todo_id = create_todo(client, auth).json()["id"]
        res = client.get(f"/todos/{todo_id}", headers=auth)
        assert res.status_code == 200
        assert res.json()["id"] == todo_id

    def test_get_nonexistent(self, client, auth):
        assert client.get("/todos/9999", headers=auth).status_code == 404

    def test_get_other_users_todo_is_404(self, client, auth):
        todo_id = create_todo(client, auth).json()["id"]
        other = register_and_login(client, username="bob", password="password456")
        assert client.get(f"/todos/{todo_id}", headers=other).status_code == 404


class TestPatchTodo:
    def test_partial_update(self, client, auth):
        todo_id = create_todo(client, auth, title="before", description="desc").json()["id"]
        res = client.patch(f"/todos/{todo_id}", json={"title": "after"}, headers=auth)
        assert res.status_code == 200
        body = res.json()
        assert body["title"] == "after"
        assert body["description"] == "desc"  # 未指定フィールドは保持

    def test_update_status(self, client, auth):
        todo_id = create_todo(client, auth).json()["id"]
        res = client.patch(f"/todos/{todo_id}", json={"status": "done"}, headers=auth)
        assert res.status_code == 200
        assert res.json()["status"] == "done"
        res = client.patch(f"/todos/{todo_id}", json={"status": "open"}, headers=auth)
        assert res.json()["status"] == "open"

    def test_invalid_status(self, client, auth):
        todo_id = create_todo(client, auth).json()["id"]
        res = client.patch(f"/todos/{todo_id}", json={"status": "closed"}, headers=auth)
        assert res.status_code == 422

    def test_patch_validations_match_post(self, client, auth):
        todo_id = create_todo(client, auth).json()["id"]
        assert client.patch(f"/todos/{todo_id}", json={"title": "   "}, headers=auth).status_code == 422
        assert client.patch(f"/todos/{todo_id}", json={"title": "a" * 101}, headers=auth).status_code == 422
        assert client.patch(f"/todos/{todo_id}", json={"description": "d" * 1001}, headers=auth).status_code == 422
        assert client.patch(f"/todos/{todo_id}", json={"due_date": "bogus"}, headers=auth).status_code == 422
        assert client.patch(f"/todos/{todo_id}", json={"tags": [f"t{i}" for i in range(11)]}, headers=auth).status_code == 422

    def test_patch_title_trimmed_and_tags_normalized(self, client, auth):
        todo_id = create_todo(client, auth).json()["id"]
        res = client.patch(f"/todos/{todo_id}", json={"title": "  New  ", "tags": ["A", "a", "B"]}, headers=auth)
        assert res.status_code == 200
        assert res.json()["title"] == "New"
        assert res.json()["tags"] == ["a", "b"]

    def test_patch_due_date(self, client, auth):
        todo_id = create_todo(client, auth).json()["id"]
        res = client.patch(f"/todos/{todo_id}", json={"due_date": "2026-12-31T23:59:59"}, headers=auth)
        assert res.status_code == 200
        assert res.json()["due_date"] == "2026-12-31T23:59:59"

    def test_patch_empty_body_is_noop(self, client, auth):
        created = create_todo(client, auth, title="keep").json()
        res = client.patch(f"/todos/{created['id']}", json={}, headers=auth)
        assert res.status_code == 200
        assert res.json() == created

    def test_patch_nonexistent(self, client, auth):
        res = client.patch("/todos/9999", json={"title": "x"}, headers=auth)
        assert res.status_code == 404

    def test_patch_other_users_todo_is_404(self, client, auth):
        todo_id = create_todo(client, auth).json()["id"]
        other = register_and_login(client, username="bob", password="password456")
        res = client.patch(f"/todos/{todo_id}", json={"title": "hijack"}, headers=other)
        assert res.status_code == 404


class TestDeleteTodo:
    def test_delete(self, client, auth):
        todo_id = create_todo(client, auth).json()["id"]
        res = client.delete(f"/todos/{todo_id}", headers=auth)
        assert res.status_code == 204
        assert res.content == b""
        assert client.get(f"/todos/{todo_id}", headers=auth).status_code == 404

    def test_delete_nonexistent(self, client, auth):
        assert client.delete("/todos/9999", headers=auth).status_code == 404

    def test_delete_other_users_todo_is_404(self, client, auth):
        todo_id = create_todo(client, auth).json()["id"]
        other = register_and_login(client, username="bob", password="password456")
        assert client.delete(f"/todos/{todo_id}", headers=other).status_code == 404
        # 本人からはまだ見える
        assert client.get(f"/todos/{todo_id}", headers=auth).status_code == 200
