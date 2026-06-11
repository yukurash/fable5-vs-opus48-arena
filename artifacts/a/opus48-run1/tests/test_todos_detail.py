def _create(client, h, **kwargs):
    payload = {"title": "t"}
    payload.update(kwargs)
    resp = client.post("/todos", json=payload, headers=h)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_get_own_todo(client, auth):
    h = auth()
    todo = _create(client, h, title="mine")
    resp = client.get(f"/todos/{todo['id']}", headers=h)
    assert resp.status_code == 200
    assert resp.json()["id"] == todo["id"]


def test_get_missing_todo_404(client, auth):
    h = auth()
    assert client.get("/todos/999", headers=h).status_code == 404


def test_get_other_users_todo_404(client, auth):
    ha = auth("alice")
    hb = auth("bob")
    todo = _create(client, ha, title="alice")
    # bob may not even learn it exists
    assert client.get(f"/todos/{todo['id']}", headers=hb).status_code == 404


def test_patch_partial_update(client, auth):
    h = auth()
    todo = _create(client, h, title="orig", description="d", tags=["a"])
    resp = client.patch(
        f"/todos/{todo['id']}", json={"title": "updated"}, headers=h
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "updated"
    assert body["description"] == "d"  # untouched
    assert body["tags"] == ["a"]  # untouched


def test_patch_status(client, auth):
    h = auth()
    todo = _create(client, h)
    resp = client.patch(
        f"/todos/{todo['id']}", json={"status": "done"}, headers=h
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "done"


def test_patch_invalid_status_422(client, auth):
    h = auth()
    todo = _create(client, h)
    resp = client.patch(
        f"/todos/{todo['id']}", json={"status": "archived"}, headers=h
    )
    assert resp.status_code == 422


def test_patch_reapplies_validation(client, auth):
    h = auth()
    todo = _create(client, h)
    resp = client.patch(f"/todos/{todo['id']}", json={"title": "   "}, headers=h)
    assert resp.status_code == 422


def test_patch_tags_normalized(client, auth):
    h = auth()
    todo = _create(client, h)
    resp = client.patch(
        f"/todos/{todo['id']}", json={"tags": ["A", "a", "B"]}, headers=h
    )
    assert resp.status_code == 200
    assert resp.json()["tags"] == ["a", "b"]


def test_patch_clear_due_date(client, auth):
    h = auth()
    todo = _create(client, h, due_date="2026-07-01T12:00:00")
    resp = client.patch(
        f"/todos/{todo['id']}", json={"due_date": None}, headers=h
    )
    assert resp.status_code == 200
    assert resp.json()["due_date"] is None


def test_patch_other_users_todo_404(client, auth):
    ha = auth("alice")
    hb = auth("bob")
    todo = _create(client, ha)
    resp = client.patch(f"/todos/{todo['id']}", json={"title": "x"}, headers=hb)
    assert resp.status_code == 404


def test_patch_missing_404(client, auth):
    h = auth()
    assert (
        client.patch("/todos/999", json={"title": "x"}, headers=h).status_code == 404
    )


def test_delete_own_todo(client, auth):
    h = auth()
    todo = _create(client, h)
    resp = client.delete(f"/todos/{todo['id']}", headers=h)
    assert resp.status_code == 204
    assert resp.content == b""
    # gone now
    assert client.get(f"/todos/{todo['id']}", headers=h).status_code == 404


def test_delete_missing_404(client, auth):
    h = auth()
    assert client.delete("/todos/999", headers=h).status_code == 404


def test_delete_other_users_todo_404(client, auth):
    ha = auth("alice")
    hb = auth("bob")
    todo = _create(client, ha)
    assert client.delete(f"/todos/{todo['id']}", headers=hb).status_code == 404
    # still there for alice
    assert client.get(f"/todos/{todo['id']}", headers=ha).status_code == 200
