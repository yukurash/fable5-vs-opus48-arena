"""Tasklet — ToDo管理 REST API (spec.md 準拠)。

インメモリ永続化。`python -m uvicorn app.main:app --port 8000` で起動する。
"""

import hashlib
import re
import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Response
from pydantic import BaseModel

app = FastAPI(title="Tasklet")

USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,30}$")

# ---------------------------------------------------------------------------
# インメモリストア
# ---------------------------------------------------------------------------

users: dict[int, dict[str, Any]] = {}          # user_id -> {id, username, salt, password_hash}
users_by_name: dict[str, int] = {}             # username -> user_id
tokens: dict[str, int] = {}                    # token -> user_id
todos: dict[int, dict[str, Any]] = {}          # todo_id -> todo dict (owner_id を含む)

_next_user_id = 1
_next_todo_id = 1


def reset_state() -> None:
    """テスト用: 全状態を初期化する。"""
    global _next_user_id, _next_todo_id
    users.clear()
    users_by_name.clear()
    tokens.clear()
    todos.clear()
    _next_user_id = 1
    _next_todo_id = 1


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((salt + password).encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# 認証
# ---------------------------------------------------------------------------

class Credentials(BaseModel):
    username: str
    password: str


@app.post("/auth/register", status_code=201)
def register(body: Credentials):
    if not USERNAME_RE.fullmatch(body.username):
        raise HTTPException(status_code=422, detail="username must be 3-30 chars of [A-Za-z0-9_]")
    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="password must be at least 8 chars")
    if body.username in users_by_name:
        raise HTTPException(status_code=409, detail="username already exists")

    global _next_user_id
    user_id = _next_user_id
    _next_user_id += 1
    salt = secrets.token_hex(8)
    users[user_id] = {
        "id": user_id,
        "username": body.username,
        "salt": salt,
        "password_hash": _hash_password(body.password, salt),
    }
    users_by_name[body.username] = user_id
    return {"id": user_id, "username": body.username}


@app.post("/auth/login")
def login(body: Credentials):
    user_id = users_by_name.get(body.username)
    if user_id is None:
        raise HTTPException(status_code=401, detail="invalid username or password")
    user = users[user_id]
    if _hash_password(body.password, user["salt"]) != user["password_hash"]:
        raise HTTPException(status_code=401, detail="invalid username or password")
    token = secrets.token_hex(16)
    tokens[token] = user_id
    return {"token": token}


def current_user_id(authorization: str | None = Header(default=None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing or invalid Authorization header")
    token = authorization[len("Bearer "):].strip()
    user_id = tokens.get(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="invalid token")
    return user_id


# ---------------------------------------------------------------------------
# ToDo バリデーション
# ---------------------------------------------------------------------------

def normalize_title(value: str) -> str:
    title = value.strip()
    if not 1 <= len(title) <= 100:
        raise HTTPException(status_code=422, detail="title must be 1-100 chars after trimming")
    return title


def normalize_description(value: str | None) -> str | None:
    if value is not None and len(value) > 1000:
        raise HTTPException(status_code=422, detail="description must be at most 1000 chars")
    return value


def parse_due_date(value: str | None) -> datetime | None:
    if value is None:
        return None
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="due_date must be an ISO 8601 datetime string")


def normalize_tags(value: list[str] | None) -> list[str]:
    if value is None:
        return []
    result: list[str] = []
    seen: set[str] = set()
    for tag in value:
        if not 1 <= len(tag) <= 20:
            raise HTTPException(status_code=422, detail="each tag must be 1-20 chars")
        lowered = tag.lower()
        if lowered not in seen:
            seen.add(lowered)
            result.append(lowered)
    if len(result) > 10:
        raise HTTPException(status_code=422, detail="at most 10 unique tags are allowed")
    return result


def normalize_status(value: str) -> str:
    if value not in ("open", "done"):
        raise HTTPException(status_code=422, detail='status must be "open" or "done"')
    return value


def todo_response(todo: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": todo["id"],
        "title": todo["title"],
        "description": todo["description"],
        "due_date": todo["due_date"].isoformat() if todo["due_date"] is not None else None,
        "tags": todo["tags"],
        "status": todo["status"],
        "created_at": todo["created_at"].isoformat(),
    }


# ---------------------------------------------------------------------------
# ToDo エンドポイント
# ---------------------------------------------------------------------------

class TodoCreate(BaseModel):
    title: str
    description: str | None = None
    due_date: str | None = None
    tags: list[str] | None = None


class TodoPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    due_date: str | None = None
    tags: list[str] | None = None
    status: str | None = None


@app.post("/todos", status_code=201)
def create_todo(body: TodoCreate, user_id: int = Depends(current_user_id)):
    global _next_todo_id
    todo = {
        "id": _next_todo_id,
        "owner_id": user_id,
        "title": normalize_title(body.title),
        "description": normalize_description(body.description),
        "due_date": parse_due_date(body.due_date),
        "tags": normalize_tags(body.tags),
        "status": "open",
        "created_at": datetime.now(),
    }
    _next_todo_id += 1
    todos[todo["id"]] = todo
    return todo_response(todo)


def _due_date_sort_key(todo: dict[str, Any]) -> float:
    """tz aware/naive 混在でも比較できるよう epoch 秒に正規化(naive は UTC とみなす)。"""
    dt = todo["due_date"]
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.timestamp()


@app.get("/todos")
def list_todos(
    user_id: int = Depends(current_user_id),
    status: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    q: str | None = Query(default=None),
    sort: str | None = Query(default=None),
    page: int = Query(default=1),
    per_page: int = Query(default=20),
):
    if status is not None and status not in ("open", "done"):
        raise HTTPException(status_code=422, detail='status must be "open" or "done"')
    if sort is not None and sort not in ("due_date_asc", "due_date_desc"):
        raise HTTPException(status_code=422, detail='sort must be "due_date_asc" or "due_date_desc"')
    if page < 1:
        raise HTTPException(status_code=422, detail="page must be >= 1")
    if not 1 <= per_page <= 100:
        raise HTTPException(status_code=422, detail="per_page must be between 1 and 100")

    # created_at 昇順 = 挿入順(id 昇順)
    items = [t for t in todos.values() if t["owner_id"] == user_id]

    if status is not None:
        items = [t for t in items if t["status"] == status]
    if tag is not None:
        tag_lower = tag.lower()
        items = [t for t in items if tag_lower in t["tags"]]
    if q is not None:
        q_lower = q.lower()
        items = [
            t for t in items
            if q_lower in t["title"].lower()
            or (t["description"] is not None and q_lower in t["description"].lower())
        ]

    if sort is not None:
        with_due = [t for t in items if t["due_date"] is not None]
        without_due = [t for t in items if t["due_date"] is None]
        with_due.sort(key=_due_date_sort_key, reverse=(sort == "due_date_desc"))
        items = with_due + without_due  # due_date が null のものは常に末尾

    total = len(items)
    start = (page - 1) * per_page
    page_items = items[start:start + per_page]

    return {
        "items": [todo_response(t) for t in page_items],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


def _get_owned_todo(todo_id: int, user_id: int) -> dict[str, Any]:
    todo = todos.get(todo_id)
    if todo is None or todo["owner_id"] != user_id:
        # 他ユーザーの ToDo は存在自体を隠す
        raise HTTPException(status_code=404, detail="todo not found")
    return todo


@app.get("/todos/{todo_id}")
def get_todo(todo_id: int, user_id: int = Depends(current_user_id)):
    return todo_response(_get_owned_todo(todo_id, user_id))


@app.patch("/todos/{todo_id}")
def patch_todo(todo_id: int, body: TodoPatch, user_id: int = Depends(current_user_id)):
    todo = _get_owned_todo(todo_id, user_id)
    fields = body.model_fields_set

    updates: dict[str, Any] = {}
    if "title" in fields:
        if body.title is None:
            raise HTTPException(status_code=422, detail="title cannot be null")
        updates["title"] = normalize_title(body.title)
    if "description" in fields:
        updates["description"] = normalize_description(body.description)
    if "due_date" in fields:
        updates["due_date"] = parse_due_date(body.due_date)
    if "tags" in fields:
        updates["tags"] = normalize_tags(body.tags)
    if "status" in fields:
        if body.status is None:
            raise HTTPException(status_code=422, detail='status must be "open" or "done"')
        updates["status"] = normalize_status(body.status)

    todo.update(updates)
    return todo_response(todo)


@app.delete("/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int, user_id: int = Depends(current_user_id)):
    _get_owned_todo(todo_id, user_id)
    del todos[todo_id]
    return Response(status_code=204)
