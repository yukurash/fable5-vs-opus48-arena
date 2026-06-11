"""In-memory data store for users, tokens and todos.

State lives in process memory only and is wiped on restart, which the spec
allows. ``reset()`` exists so tests can start from a clean slate.
"""

from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional


@dataclass
class User:
    id: int
    username: str
    password_hash: str
    salt: str


@dataclass
class Todo:
    id: int
    owner_id: int
    title: str
    description: Optional[str]
    due_date: Optional[datetime]
    tags: List[str]
    status: str
    created_at: datetime

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "tags": list(self.tags),
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }


class Store:
    def __init__(self) -> None:
        self.reset()

    def reset(self) -> None:
        self._users: Dict[int, User] = {}
        self._users_by_name: Dict[str, User] = {}
        self._tokens: Dict[str, int] = {}
        self._todos: Dict[int, Todo] = {}
        self._user_seq = 0
        self._todo_seq = 0

    # --- users -----------------------------------------------------------
    def get_user_by_name(self, username: str) -> Optional[User]:
        return self._users_by_name.get(username)

    def create_user(self, username: str, password: str) -> User:
        self._user_seq += 1
        salt = secrets.token_hex(16)
        user = User(
            id=self._user_seq,
            username=username,
            password_hash=_hash_password(password, salt),
            salt=salt,
        )
        self._users[user.id] = user
        self._users_by_name[username] = user
        return user

    def verify_credentials(self, username: str, password: str) -> Optional[User]:
        user = self._users_by_name.get(username)
        if user is None:
            return None
        if not secrets.compare_digest(
            user.password_hash, _hash_password(password, user.salt)
        ):
            return None
        return user

    # --- tokens ----------------------------------------------------------
    def issue_token(self, user: User) -> str:
        token = secrets.token_urlsafe(32)
        self._tokens[token] = user.id
        return token

    def user_for_token(self, token: str) -> Optional[User]:
        user_id = self._tokens.get(token)
        if user_id is None:
            return None
        return self._users.get(user_id)

    # --- todos -----------------------------------------------------------
    def create_todo(
        self,
        owner_id: int,
        title: str,
        description: Optional[str],
        due_date: Optional[datetime],
        tags: List[str],
        created_at: datetime,
    ) -> Todo:
        self._todo_seq += 1
        todo = Todo(
            id=self._todo_seq,
            owner_id=owner_id,
            title=title,
            description=description,
            due_date=due_date,
            tags=list(tags),
            status="open",
            created_at=created_at,
        )
        self._todos[todo.id] = todo
        return todo

    def get_todo(self, todo_id: int) -> Optional[Todo]:
        return self._todos.get(todo_id)

    def list_todos_for_owner(self, owner_id: int) -> List[Todo]:
        return [t for t in self._todos.values() if t.owner_id == owner_id]

    def delete_todo(self, todo_id: int) -> None:
        self._todos.pop(todo_id, None)


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256((salt + password).encode("utf-8")).hexdigest()


# Module-level singleton used by the application.
store = Store()
