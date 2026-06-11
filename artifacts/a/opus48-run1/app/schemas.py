"""Pydantic request schemas.

Validation errors raised here surface as HTTP 422, per the spec.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator

from . import validation


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    username: str
    password: str

    @field_validator("username")
    @classmethod
    def _username(cls, v):
        return validation.normalize_username(v)

    @field_validator("password")
    @classmethod
    def _password(cls, v):
        return validation.normalize_password(v)


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    # Login does not re-run format rules: any string is accepted and simply
    # fails authentication (401) if it does not match a stored credential.
    username: str
    password: str


class TodoCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    tags: List[str] = []

    @field_validator("title", mode="before")
    @classmethod
    def _title(cls, v):
        return validation.normalize_title(v)

    @field_validator("description", mode="before")
    @classmethod
    def _description(cls, v):
        return validation.normalize_description(v)

    @field_validator("due_date", mode="before")
    @classmethod
    def _due_date(cls, v):
        return validation.parse_due_date(v)

    @field_validator("tags", mode="before")
    @classmethod
    def _tags(cls, v):
        return validation.normalize_tags(v)


class TodoUpdate(BaseModel):
    """Partial update. Only fields present in the request body are applied.

    Use ``model_fields_set`` to learn which fields the client actually sent.
    """

    model_config = ConfigDict(extra="ignore")

    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None

    @field_validator("title", mode="before")
    @classmethod
    def _title(cls, v):
        # An explicit null for title is not allowed; title cannot be cleared.
        if v is None:
            raise ValueError("title may not be null")
        return validation.normalize_title(v)

    @field_validator("description", mode="before")
    @classmethod
    def _description(cls, v):
        return validation.normalize_description(v)

    @field_validator("due_date", mode="before")
    @classmethod
    def _due_date(cls, v):
        return validation.parse_due_date(v)

    @field_validator("tags", mode="before")
    @classmethod
    def _tags(cls, v):
        if v is None:
            raise ValueError("tags may not be null")
        return validation.normalize_tags(v)

    @field_validator("status", mode="before")
    @classmethod
    def _status(cls, v):
        return validation.normalize_status(v)
