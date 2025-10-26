"""HTTP client for API service communication."""
import httpx
import os
from typing import Dict, Any, Optional

class ApiClient:
    """Client for API service."""

    def __init__(self):
        self.base_url = os.getenv("API_SERVICE_URL", "http://localhost:3000")
        self.client = httpx.Client(base_url=self.base_url, timeout=10.0)

    def get_task(self, task_id: int) -> Optional[Dict[str, Any]]:
        """Get task details from API service."""
        try:
            response = self.client.get(f"/api/tasks/{task_id}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Failed to get task: {e}")
            return None

    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user details from API service."""
        try:
            response = self.client.get(f"/api/users/{user_id}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Failed to get user: {e}")
            return None

    def update_task(self, task_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update task via API service."""
        try:
            response = self.client.put(f"/api/tasks/{task_id}", json=data)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Failed to update task: {e}")
            return None
