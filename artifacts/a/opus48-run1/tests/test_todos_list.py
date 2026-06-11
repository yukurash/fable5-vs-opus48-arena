def _create(client, h, **kwargs):
    payload = {"title": "t"}
    payload.update(kwargs)
    resp = client.post("/todos", json=payload, headers=h)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_list_only_own_todos(client, auth):
    ha = auth("alice")
    hb = auth("bob")
    _create(client, ha, title="alice task")
    _create(client, hb, title="bob task")

    resp = client.get("/todos", headers=ha)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "alice task"


def test_list_envelope_fields(client, auth):
    h = auth()
    _create(client, h)
    resp = client.get("/todos", headers=h)
    body = resp.json()
    assert set(body.keys()) == {"items", "total", "page", "per_page"}
    assert body["page"] == 1
    assert body["per_page"] == 20


def test_filter_by_status(client, auth):
    h = auth()
    t1 = _create(client, h, title="open one")
    t2 = _create(client, h, title="done one")
    client.patch(f"/todos/{t2['id']}", json={"status": "done"}, headers=h)

    resp = client.get("/todos", params={"status": "done"}, headers=h)
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["id"] == t2["id"]

    resp = client.get("/todos", params={"status": "open"}, headers=h)
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["id"] == t1["id"]


def test_filter_invalid_status_422(client, auth):
    h = auth()
    resp = client.get("/todos", params={"status": "nope"}, headers=h)
    assert resp.status_code == 422


def test_filter_by_tag_case_insensitive(client, auth):
    h = auth()
    _create(client, h, title="has tag", tags=["Work"])
    _create(client, h, title="no tag")
    resp = client.get("/todos", params={"tag": "WORK"}, headers=h)
    assert resp.json()["total"] == 1
    assert resp.json()["items"][0]["title"] == "has tag"


def test_search_q_case_insensitive_title_and_description(client, auth):
    h = auth()
    _create(client, h, title="Buy MILK")
    _create(client, h, title="other", description="contains milk word")
    _create(client, h, title="nothing")
    resp = client.get("/todos", params={"q": "milk"}, headers=h)
    assert resp.json()["total"] == 2


def test_sort_invalid_422(client, auth):
    h = auth()
    resp = client.get("/todos", params={"sort": "weird"}, headers=h)
    assert resp.status_code == 422


def test_sort_due_date_asc_nulls_last(client, auth):
    h = auth()
    a = _create(client, h, title="a", due_date="2026-07-01T00:00:00")
    b = _create(client, h, title="b", due_date="2026-06-01T00:00:00")
    c = _create(client, h, title="c")  # null due_date
    resp = client.get("/todos", params={"sort": "due_date_asc"}, headers=h)
    ids = [i["id"] for i in resp.json()["items"]]
    assert ids == [b["id"], a["id"], c["id"]]


def test_sort_due_date_desc_nulls_last(client, auth):
    h = auth()
    a = _create(client, h, title="a", due_date="2026-07-01T00:00:00")
    b = _create(client, h, title="b", due_date="2026-06-01T00:00:00")
    c = _create(client, h, title="c")  # null due_date
    resp = client.get("/todos", params={"sort": "due_date_desc"}, headers=h)
    ids = [i["id"] for i in resp.json()["items"]]
    assert ids == [a["id"], b["id"], c["id"]]


def test_default_sort_created_at_asc(client, auth):
    h = auth()
    first = _create(client, h, title="first")
    second = _create(client, h, title="second")
    third = _create(client, h, title="third")
    resp = client.get("/todos", headers=h)
    ids = [i["id"] for i in resp.json()["items"]]
    assert ids == [first["id"], second["id"], third["id"]]


def test_pagination(client, auth):
    h = auth()
    created = [_create(client, h, title=f"t{i}") for i in range(25)]
    resp = client.get("/todos", params={"page": 1, "per_page": 10}, headers=h)
    body = resp.json()
    assert body["total"] == 25
    assert len(body["items"]) == 10
    assert body["page"] == 1
    assert body["per_page"] == 10

    resp = client.get("/todos", params={"page": 3, "per_page": 10}, headers=h)
    body = resp.json()
    assert len(body["items"]) == 5  # remainder
    assert body["items"][0]["id"] == created[20]["id"]


def test_page_zero_is_422(client, auth):
    h = auth()
    resp = client.get("/todos", params={"page": 0}, headers=h)
    assert resp.status_code == 422


def test_per_page_out_of_range_422(client, auth):
    h = auth()
    assert client.get("/todos", params={"per_page": 0}, headers=h).status_code == 422
    assert client.get("/todos", params={"per_page": 101}, headers=h).status_code == 422
