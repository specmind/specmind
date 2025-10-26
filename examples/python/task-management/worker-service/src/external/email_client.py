"""HTTP client for email service communication."""
import httpx
import os
from typing import Dict, Any

class EmailClient:
    """Client for email service API."""

    def __init__(self):
        self.base_url = os.getenv("EMAIL_SERVICE_URL", "http://localhost:3001")
        self.client = httpx.Client(base_url=self.base_url, timeout=10.0)

    def send_task_reminder(self, task_id: int, user_id: int, user_email: str) -> bool:
        """Send task reminder email."""
        try:
            response = self.client.post(
                "/api/emails/send",
                json={
                    "type": "task_reminder",
                    "task_id": task_id,
                    "user_id": user_id,
                    "to": user_email
                }
            )
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Failed to send reminder: {e}")
            return False
