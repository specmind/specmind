"""Celery application configuration."""
from celery import Celery
import os

# Configure Celery
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

app = Celery(
    'worker',
    broker=redis_url,
    backend=redis_url,
    include=['src.service.tasks']
)

# Celery configuration
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    task_soft_time_limit=270,
)

if __name__ == '__main__':
    app.start()
