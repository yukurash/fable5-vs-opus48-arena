"""GET /todos の一覧取得(フィルタ・検索・ソート・ページネーション)のテスト。"""

import pytest

from tests.conftest import register_and_login


def add(client, auth, title, **overrides):
    res = client.post("/todos", json={"title": title, **overrides}, headers=auth)
    assert res.status_code == 201
    return res.json()


class TestListBasics:
    def test_empty_list(self, client, auth):
        res = client.get("/todos", headers=auth)
        assert res.status_code == 200
        assert res.json() == {"items": [], "total": 0, "page": 1, "per_page": 20}

    def test_only_own_todos_visible(self, client, auth):
        add(client, auth, "mine")
        other = register_and_login(client, username="bob", password="password456")
        add(client, other, "bobs")
        res = client.get("/todos", headers=auth)
        assert res.json()["total"] == 1
        assert res.json()["items"][0]["title"] == "mine"

    def test_default_order_is_created_at_asc(self, client, auth):
        add(client, auth, "first")
        add(client, auth, "second")
        add(client, auth, "third")
        titles = [t["title"] for t in client.get("/todos", headers=auth).json()["items"]]
        assert titles == ["first", "second", "third"]


class TestStatusFilter:
    def test_filter_by_status(self, client, auth):
        a = add(client, auth, "a")
        add(client, auth, "b")
        client.patch(f"/todos/{a['id']}", json={"status": "done"}, headers=auth)

        done = client.get("/todos", params={"status": "done"}, headers=auth).json()
        assert [t["title"] for t in done["items"]] == ["a"]
        assert done["total"] == 1

        open_ = client.get("/todos", params={"status": "open"}, headers=auth).json()
        assert [t["title"] for t in open_["items"]] == ["b"]

    def test_invalid_status_value(self, client, auth):
        res = client.get("/todos", params={"status": "closed"}, headers=auth)
        assert res.status_code == 422


class TestTagFilter:
    def test_filter_by_tag(self, client, auth):
        add(client, auth, "a", tags=["work"])
        add(client, auth, "b", tags=["home"])
        res = client.get("/todos", params={"tag": "work"}, headers=auth).json()
        assert [t["title"] for t in res["items"]] == ["a"]

    def test_tag_filter_case_insensitive(self, client, auth):
        add(client, auth, "a", tags=["Work"])  # 保存時に小文字化される
        res = client.get("/todos", params={"tag": "WORK"}, headers=auth).json()
        assert res["total"] == 1


class TestSearch:
    def test_q_matches_title_case_insensitive(self, client, auth):
        add(client, auth, "Buy MILK")
        add(client, auth, "walk dog")
        res = client.get("/todos", params={"q": "milk"}, headers=auth).json()
        assert [t["title"] for t in res["items"]] == ["Buy MILK"]

    def test_q_matches_description(self, client, auth):
        add(client, auth, "a", description="Remember the EGGS")
        add(client, auth, "b", description="nothing here")
        add(client, auth, "c")  # description なし
        res = client.get("/todos", params={"q": "eggs"}, headers=auth).json()
        assert [t["title"] for t in res["items"]] == ["a"]


class TestSort:
    def setup_todos(self, client, auth):
        add(client, auth, "late", due_date="2026-09-01T00:00:00")
        add(client, auth, "none1")
        add(client, auth, "early", due_date="2026-07-01T00:00:00")
        add(client, auth, "mid", due_date="2026-08-01T00:00:00")
        add(client, auth, "none2")

    def test_sort_due_date_asc_nulls_last(self, client, auth):
        self.setup_todos(client, auth)
        res = client.get("/todos", params={"sort": "due_date_asc"}, headers=auth).json()
        titles = [t["title"] for t in res["items"]]
        assert titles == ["early", "mid", "late", "none1", "none2"]

    def test_sort_due_date_desc_nulls_last(self, client, auth):
        self.setup_todos(client, auth)
        res = client.get("/todos", params={"sort": "due_date_desc"}, headers=auth).json()
        titles = [t["title"] for t in res["items"]]
        assert titles == ["late", "mid", "early", "none1", "none2"]

    def test_invalid_sort_value(self, client, auth):
        res = client.get("/todos", params={"sort": "title_asc"}, headers=auth)
        assert res.status_code == 422


class TestPagination:
    def test_pagination(self, client, auth):
        for i in range(25):
            add(client, auth, f"todo {i:02d}")

        page1 = client.get("/todos", params={"page": 1, "per_page": 10}, headers=auth).json()
        assert page1["total"] == 25
        assert page1["page"] == 1
        assert page1["per_page"] == 10
        assert len(page1["items"]) == 10
        assert page1["items"][0]["title"] == "todo 00"

        page3 = client.get("/todos", params={"page": 3, "per_page": 10}, headers=auth).json()
        assert len(page3["items"]) == 5
        assert page3["items"][0]["title"] == "todo 20"
        assert page3["total"] == 25  # total はページに関係なく全件数

    def test_default_per_page_20(self, client, auth):
        for i in range(25):
            add(client, auth, f"todo {i}")
        res = client.get("/todos", headers=auth).json()
        assert len(res["items"]) == 20
        assert res["page"] == 1 and res["per_page"] == 20

    @pytest.mark.parametrize("params", [
        {"page": 0},
        {"page": -1},
        {"per_page": 0},
        {"per_page": 101},
        {"page": "abc"},
        {"per_page": "abc"},
    ])
    def test_invalid_pagination_params(self, client, auth, params):
        res = client.get("/todos", params=params, headers=auth)
        assert res.status_code == 422

    def test_total_counts_filtered_set(self, client, auth):
        for i in range(5):
            add(client, auth, f"work {i}", tags=["work"])
        for i in range(3):
            add(client, auth, f"home {i}", tags=["home"])
        res = client.get("/todos", params={"tag": "work", "per_page": 2}, headers=auth).json()
        assert res["total"] == 5
        assert len(res["items"]) == 2

    def test_combined_filters(self, client, auth):
        a = add(client, auth, "buy milk", tags=["errand"])
        add(client, auth, "buy eggs", tags=["errand"])
        add(client, auth, "buy milk again", tags=["other"])
        client.patch(f"/todos/{a['id']}", json={"status": "done"}, headers=auth)
        res = client.get(
            "/todos",
            params={"q": "milk", "tag": "errand", "status": "done"},
            headers=auth,
        ).json()
        assert [t["title"] for t in res["items"]] == ["buy milk"]
