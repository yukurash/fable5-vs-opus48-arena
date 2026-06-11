"""Pure normalization/validation helpers shared by the create and update schemas.

Each helper raises ``ValueError`` on invalid input. Pydantic turns those into
HTTP 422 responses, matching the spec's "validation error -> 422" rule.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional

USERNAME_RE = re.compile(r"^[A-Za-z0-9_]+$")

TITLE_MAX = 100
DESCRIPTION_MAX = 1000
TAG_MIN = 1
TAG_MAX = 20
TAGS_MAX = 10
USERNAME_MIN = 3
USERNAME_MAX = 30
PASSWORD_MIN = 8


def normalize_username(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("username must be a string")
    if not (USERNAME_MIN <= len(value) <= USERNAME_MAX):
        raise ValueError("username must be 3-30 characters")
    if not USERNAME_RE.fullmatch(value):
        raise ValueError("username may only contain letters, digits and underscores")
    return value


def normalize_password(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("password must be a string")
    if len(value) < PASSWORD_MIN:
        raise ValueError("password must be at least 8 characters")
    return value


def normalize_title(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("title must be a string")
    trimmed = value.strip()
    if not (1 <= len(trimmed) <= TITLE_MAX):
        raise ValueError("title must be 1-100 characters after trimming whitespace")
    return trimmed


def normalize_description(value: object) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("description must be a string")
    if len(value) > DESCRIPTION_MAX:
        raise ValueError("description must be at most 1000 characters")
    return value


def parse_due_date(value: object) -> Optional[datetime]:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("due_date must be an ISO 8601 string")
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        raise ValueError("due_date must be a valid ISO 8601 datetime string")


def normalize_tags(value: object) -> List[str]:
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError("tags must be a list of strings")
    result: List[str] = []
    seen = set()
    for tag in value:
        if not isinstance(tag, str):
            raise ValueError("each tag must be a string")
        lowered = tag.lower()
        if not (TAG_MIN <= len(lowered) <= TAG_MAX):
            raise ValueError("each tag must be 1-20 characters")
        if lowered not in seen:
            seen.add(lowered)
            result.append(lowered)
    if len(result) > TAGS_MAX:
        raise ValueError("at most 10 unique tags are allowed")
    return result


def normalize_status(value: object) -> str:
    if value not in ("open", "done"):
        raise ValueError('status must be "open" or "done"')
    return value
