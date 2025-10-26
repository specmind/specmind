"""Celery tasks for background processing."""
from ..celery_app import app
from ..external.api_client import ApiClient
from ..external.email_client import EmailClient
import time

api_client = ApiClient()
email_client = EmailClient()

@app.task(name='process_notification')
def process_notification(notification_data):
    """Process notification from queue."""
    notification_type = notification_data.get('type')
    task_id = notification_data.get('task_id')
    user_id = notification_data.get('user_id')

    print(f"Processing notification: {notification_type} for task {task_id}")

    if notification_type == 'task_created':
        # Log task creation
        print(f"Task {task_id} created for user {user_id}")
        return {'status': 'logged', 'task_id': task_id}

    elif notification_type == 'task_reminder':
        # Send reminder email
        task = api_client.get_task(task_id)
        user = api_client.get_user(user_id)

        if task and user:
            email_client.send_task_reminder(task_id, user_id, user['email'])
            return {'status': 'reminder_sent', 'task_id': task_id}

    return {'status': 'unknown_type'}

@app.task(name='process_task_reminders')
def process_task_reminders():
    """Periodic task to process pending task reminders."""
    print("Processing task reminders...")
    # In a real app, this would query the database for tasks due soon
    # For demo purposes, we just log
    return {'status': 'processed'}

@app.task(name='cleanup_completed_tasks')
def cleanup_completed_tasks():
    """Periodic task to archive old completed tasks."""
    print("Cleaning up completed tasks...")
    # In a real app, this would archive old completed tasks
    return {'status': 'cleaned'}

@app.task(name='generate_analytics')
def generate_analytics():
    """Generate analytics and statistics."""
    print("Generating analytics...")
    # Simulate long-running task
    time.sleep(2)
    return {'status': 'analytics_generated', 'tasks_processed': 100}
