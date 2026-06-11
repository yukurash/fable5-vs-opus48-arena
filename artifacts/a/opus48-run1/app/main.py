"""Tasklet — a simple multi-user ToDo REST API.

ASGI application is exposed as ``app`` so it can be launched with::

    python -m uvicorn app.main:app --port 8000
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Response

from .schemas import LoginRequest, RegisterRequest, TodoCreate, TodoUpdate
from .store import Todo, User, store

app = FastAPI(title="Tasklet", version="1.0.0")


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------
def get_current_user(authorization: Optional[str] = Header(default=None)) -> User:
    """Resolve the user from an ``Authorization: Bearer <token>`` header.

    Any problem (missing header, malformed header, unknown token) results in a
    401, per the spec.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication required")
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = parts[1].strip()
    user = store.user_for_token(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@app.post("/auth/register", status_code=201)
def register(body: RegisterRequest):
    if store.get_user_by_name(body.username) is not None:
        raise HTTPException(status_code=409, detail="username already taken")
    user = store.create_user(body.username, body.password)
    return {"id": user.id, "username": user.username}


@app.post("/auth/login")
def login(body: LoginRequest):
    user = store.verify_credentials(body.username, body.password)
    if user is None:
        raise HTTPException(status_code=401, detail="invalid username or password")
    return {"token": store.issue_token(user)}


# ---------------------------------------------------------------------------
# ToDo endpoints
# ---------------------------------------------------------------------------
@app.post("/todos", status_code=201)
def create_todo(body: TodoCreate, user: User = Depends(get_current_user)):
    todo = store.create_todo(
        owner_id=user.id,
        title=body.title,
        description=body.description,
        due_date=body.due_date,
        tags=body.tags,
        created_at=datetime.now().replace(microsecond=0),
    )
    return todo.to_dict()


@app.get("/todos")
def list_todos(
    user: User = Depends(get_current_user),
    status: Optional[str] = Query(default=None),
    tag: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    sort: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    if status is not None and status not in ("open", "done"):
        raise HTTPException(status_code=422, detail="status must be 'open' or 'done'")
    if sort is not None and sort not in ("due_date_asc", "due_date_desc"):
        raise HTTPException(
            status_code=422,
            detail="sort must be 'due_date_asc' or 'due_date_desc'",
        )

    items = store.list_todos_for_owner(user.id)

    if status is not None:
        items = [t for t in items if t.status == status]
    if tag is not None:
        wanted = tag.lower()
        items = [t for t in items if wanted in t.tags]
    if q is not None:
        needle = q.lower()
        items = [
            t
            for t in items
            if needle in t.title.lower()
            or (t.description is not None and needle in t.description.lower())
        ]

    items = _sort_todos(items, sort)

    total = len(items)
    start = (page - 1) * per_page
    page_items = items[start : start + per_page]

    return {
        "items": [t.to_dict() for t in page_items],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@app.get("/todos/{todo_id}")
def get_todo(todo_id: int, user: User = Depends(get_current_user)):
    todo = _owned_todo_or_404(todo_id, user)
    return todo.to_dict()


@app.patch("/todos/{todo_id}")
def update_todo(todo_id: int, body: TodoUpdate, user: User = Depends(get_current_user)):
    todo = _owned_todo_or_404(todo_id, user)
    fields = body.model_fields_set
    if "title" in fields:
        todo.title = body.title
    if "description" in fields:
        todo.description = body.description
    if "due_date" in fields:
        todo.due_date = body.due_date
    if "tags" in fields:
        todo.tags = body.tags
    if "status" in fields:
        todo.status = body.status
    return todo.to_dict()


@app.delete("/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int, user: User = Depends(get_current_user)):
    _owned_todo_or_404(todo_id, user)
    store.delete_todo(todo_id)
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _owned_todo_or_404(todo_id: int, user: User) -> Todo:
    todo = store.get_todo(todo_id)
    # Hide existence of other users' todos by returning 404, not 403.
    if todo is None or todo.owner_id != user.id:
        raise HTTPException(status_code=404, detail="todo not found")
    return todo


def _sort_todos(items: List[Todo], sort: Optional[str]) -> List[Todo]:
    if sort is None:
        # Default: created_at ascending (id as a stable tie-breaker).
        return sorted(items, key=lambda t: (t.created_at, t.id))

    # due_date sorts: rows with a null due_date always go last.
    with_due = [t for t in items if t.due_date is not None]
    without_due = sorted(
        (t for t in items if t.due_date is None), key=lambda t: (t.created_at, t.id)
    )

    with_due.sort(key=lambda t: t.id)  # stable secondary order
    with_due.sort(key=lambda t: t.due_date, reverse=(sort == "due_date_desc"))

    return with_due + without_due
