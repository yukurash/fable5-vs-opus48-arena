def test_create_minimal(client, auth):
    h = auth()
    resp = client.post("/todos", json={"title": "buy milk"}, headers=h)
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "buy milk"
    assert body["description"] is None
    assert body["due_date"] is None
    assert body["tags"] == []
    assert body["status"] == "open"
    assert isinstance(body["id"], int)
    assert isinstance(body["created_at"], str)


def test_create_full(client, auth):
    h = auth()
    resp = client.post(
        "/todos",
        json={
            "title": "  buy milk  ",
            "description": "low fat",
            "due_date": "2026-07-01T12:00:00",
            "tags": ["Buy", "buy", "ERRAND"],
        },
        headers=h,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "buy milk"  # trimmed
    assert body["due_date"] == "2026-07-01T12:00:00"
    assert body["tags"] == ["buy", "errand"]  # lowercased + deduped, order preserved


def test_title_whitespace_only_is_422(client, auth):
    h = auth()
    resp = client.post("/todos", json={"title": "    "}, headers=h)
    assert resp.status_code == 422


def test_title_required(client, auth):
    h = auth()
    resp = client.post("/todos", json={"description": "x"}, headers=h)
    assert resp.status_code == 422


def test_title_too_long(client, auth):
    h = auth()
    resp = client.post("/todos", json={"title": "a" * 101}, headers=h)
    assert resp.status_code == 422


def test_title_max_length_ok(client, auth):
    h = auth()
    resp = client.post("/todos", json={"title": "a" * 100}, headers=h)
    assert resp.status_code == 201


def test_description_too_long(client, auth):
    h = auth()
    resp = client.post(
        "/todos", json={"title": "x", "description": "d" * 1001}, headers=h
    )
    assert resp.status_code == 422


def test_due_date_invalid(client, auth):
    h = auth()
    resp = client.post(
        "/todos", json={"title": "x", "due_date": "not-a-date"}, headers=h
    )
    assert resp.status_code == 422


def test_due_date_past_allowed(client, auth):
    h = auth()
    resp = client.post(
        "/todos", json={"title": "x", "due_date": "2000-01-01T00:00:00"}, headers=h
    )
    assert resp.status_code == 201


def test_tags_too_many_after_dedup(client, auth):
    h = auth()
    tags = [f"tag{i}" for i in range(11)]
    resp = client.post("/todos", json={"title": "x", "tags": tags}, headers=h)
    assert resp.status_code == 422


def test_tags_ten_unique_after_dedup_ok(client, auth):
    h = auth()
    # 11 entries but one duplicate -> 10 unique -> allowed
    tags = [f"tag{i}" for i in range(10)] + ["tag0"]
    resp = client.post("/todos", json={"title": "x", "tags": tags}, headers=h)
    assert resp.status_code == 201
    assert len(resp.json()["tags"]) == 10


def test_tag_too_long(client, auth):
    h = auth()
    resp = client.post(
        "/todos", json={"title": "x", "tags": ["a" * 21]}, headers=h
    )
    assert resp.status_code == 422


def test_tag_empty_is_422(client, auth):
    h = auth()
    resp = client.post("/todos", json={"title": "x", "tags": [""]}, headers=h)
    assert resp.status_code == 422


def test_status_is_always_open(client, auth):
    h = auth()
    resp = client.post(
        "/todos", json={"title": "x", "status": "done"}, headers=h
    )
    assert resp.status_code == 201
    assert resp.json()["status"] == "open"
