"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class TaskBase(BaseModel):
    """Base task schema."""
    title: str
    description: Optional[str] = None
    priority: str = "medium"

class TaskCreate(TaskBase):
    """Schema for creating a task."""
    pass

class TaskUpdate(BaseModel):
    """Schema for updating a task."""
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[str] = None

class Task(TaskBase):
    """Task schema with database fields."""
    id: int
    completed: bool
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    username: str

class UserCreate(UserBase):
    """Schema for creating a user."""
    hashed_password: str

class User(UserBase):
    """User schema with database fields."""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
