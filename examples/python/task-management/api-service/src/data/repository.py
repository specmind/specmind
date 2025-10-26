"""Data access layer for tasks and users."""
from sqlalchemy.orm import Session
from typing import List, Optional
from .models import Task, User
from ..service.schemas import TaskCreate, TaskUpdate, UserCreate

class TaskRepository:
    """Repository for task data access."""

    def __init__(self, db: Session):
        self.db = db

    def get_task(self, task_id: int) -> Optional[Task]:
        """Get a task by ID."""
        return self.db.query(Task).filter(Task.id == task_id).first()

    def get_tasks(self, user_id: int, skip: int = 0, limit: int = 100) -> List[Task]:
        """Get all tasks for a user."""
        return self.db.query(Task).filter(Task.user_id == user_id).offset(skip).limit(limit).all()

    def create_task(self, task: TaskCreate, user_id: int) -> Task:
        """Create a new task."""
        db_task = Task(**task.dict(), user_id=user_id)
        self.db.add(db_task)
        self.db.commit()
        self.db.refresh(db_task)
        return db_task

    def update_task(self, task_id: int, task: TaskUpdate) -> Optional[Task]:
        """Update a task."""
        db_task = self.get_task(task_id)
        if db_task:
            for key, value in task.dict(exclude_unset=True).items():
                setattr(db_task, key, value)
            self.db.commit()
            self.db.refresh(db_task)
        return db_task

    def delete_task(self, task_id: int) -> bool:
        """Delete a task."""
        db_task = self.get_task(task_id)
        if db_task:
            self.db.delete(db_task)
            self.db.commit()
            return True
        return False

class UserRepository:
    """Repository for user data access."""

    def __init__(self, db: Session):
        self.db = db

    def get_user(self, user_id: int) -> Optional[User]:
        """Get a user by ID."""
        return self.db.query(User).filter(User.id == user_id).first()

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get a user by email."""
        return self.db.query(User).filter(User.email == email).first()

    def create_user(self, user: UserCreate) -> User:
        """Create a new user."""
        db_user = User(**user.dict())
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user
