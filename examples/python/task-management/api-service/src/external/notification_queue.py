"""Redis queue for background notifications."""
import redis
import json
import os
from typing import Dict, Any

class NotificationQueue:
    """Queue for background notification jobs."""

    def __init__(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.client = redis.from_url(redis_url)
        self.queue_name = "notifications"

    def send_task_created(self, task_id: int, user_id: int) -> None:
        """Queue notification for task creation."""
        message = {
            "type": "task_created",
            "task_id": task_id,
            "user_id": user_id
        }
        self.client.rpush(self.queue_name, json.dumps(message))

    def send_task_reminder(self, task_id: int, user_id: int) -> None:
        """Queue notification for task reminder."""
        message = {
            "type": "task_reminder",
            "task_id": task_id,
            "user_id": user_id
        }
        self.client.rpush(self.queue_name, json.dumps(message))
