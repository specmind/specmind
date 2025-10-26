"""Business logic for email operations."""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from typing import Dict, Any

class EmailService:
    """Service for sending emails via SMTP."""

    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "localhost")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@taskmanager.com")

    def send_email(self, to: str, subject: str, body: str) -> bool:
        """Send an email via SMTP."""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to
            msg['Subject'] = subject

            msg.attach(MIMEText(body, 'html'))

            # In development, just log the email
            if os.getenv("ENV") == "development":
                print(f"[EMAIL] To: {to}, Subject: {subject}")
                print(f"[EMAIL] Body: {body}")
                return True

            # In production, send via SMTP
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                if self.smtp_user and self.smtp_password:
                    server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False

    def send_task_completed_email(self, task_id: int, user_email: str) -> bool:
        """Send task completion notification email."""
        subject = "Task Completed"
        body = f"""
        <html>
            <body>
                <h2>Task Completed!</h2>
                <p>Your task (ID: {task_id}) has been marked as completed.</p>
                <p>Great job!</p>
            </body>
        </html>
        """
        return self.send_email(user_email, subject, body)

    def send_welcome_email(self, user_email: str, username: str) -> bool:
        """Send welcome email to new user."""
        subject = "Welcome to Task Manager"
        body = f"""
        <html>
            <body>
                <h2>Welcome, {username}!</h2>
                <p>Thank you for joining Task Manager.</p>
                <p>Start organizing your tasks today!</p>
            </body>
        </html>
        """
        return self.send_email(user_email, subject, body)
