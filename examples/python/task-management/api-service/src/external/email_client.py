"""HTTP client for email service communication."""
import httpx
import os
from typing import Dict, Any

class EmailClient:
    """Client for email service API."""

    def __init__(self):
        self.base_url = os.getenv("EMAIL_SERVICE_URL", "http://localhost:3001")
        self.client = httpx.Client(base_url=self.base_url, timeout=10.0)

    def send_task_completed(self, task_id: int, user_id: int) -> Dict[str, Any]:
        """Send task completion email."""
        response = self.client.post(
            "/api/emails/send",
            json={
                "type": "task_completed",
                "task_id": task_id,
                "user_id": user_id
            }
        )
        response.raise_for_status()
        return response.json()

    def send_welcome_email(self, user_id: int, email: str) -> Dict[str, Any]:
        """Send welcome email to new user."""
        response = self.client.post(
            "/api/emails/send",
            json={
                "type": "welcome",
                "user_id": user_id,
                "to": email
            }
        )
        response.raise_for_status()
        return response.json()
