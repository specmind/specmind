"""Business logic for task operations."""
from typing import List, Optional
from sqlalchemy.orm import Session
from ..data.repository import TaskRepository
from ..data.cache import RedisCache
from ..external.email_client import EmailClient
from ..external.notification_queue import NotificationQueue
from .schemas import Task, TaskCreate, TaskUpdate

class TaskService:
    """Service layer for task operations."""

    def __init__(self, db: Session):
        self.repository = TaskRepository(db)
        self.cache = RedisCache()
        self.email_client = EmailClient()
        self.notification_queue = NotificationQueue()

    def get_task(self, task_id: int) -> Optional[Task]:
        """Get a task by ID with caching."""
        cache_key = f"task:{task_id}"

        # Try cache first
        cached = self.cache.get(cache_key)
        if cached:
            return Task(**cached)

        # Fetch from database
        task = self.repository.get_task(task_id)
        if task:
            self.cache.set(cache_key, task.__dict__)

        return task

    def get_tasks(self, user_id: int, skip: int = 0, limit: int = 100) -> List[Task]:
        """Get all tasks for a user."""
        return self.repository.get_tasks(user_id, skip, limit)

    def create_task(self, task: TaskCreate, user_id: int) -> Task:
        """Create a new task and send notification."""
        db_task = self.repository.create_task(task, user_id)

        # Queue notification
        self.notification_queue.send_task_created(db_task.id, user_id)

        return db_task

    def update_task(self, task_id: int, task: TaskUpdate) -> Optional[Task]:
        """Update a task and invalidate cache."""
        db_task = self.repository.update_task(task_id, task)

        if db_task:
            # Invalidate cache
            self.cache.delete(f"task:{task_id}")

            # Send completion email if task is completed
            if task.completed:
                self.email_client.send_task_completed(db_task.id, db_task.user_id)

        return db_task

    def delete_task(self, task_id: int) -> bool:
        """Delete a task and invalidate cache."""
        success = self.repository.delete_task(task_id)
        if success:
            self.cache.delete(f"task:{task_id}")
        return success
