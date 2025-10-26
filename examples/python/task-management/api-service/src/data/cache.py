"""Redis cache implementation."""
import redis
import json
import os
from typing import Optional, Any

class RedisCache:
    """Redis cache client."""

    def __init__(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.client = redis.from_url(redis_url, decode_responses=True)

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        value = self.client.get(key)
        if value:
            return json.loads(value)
        return None

    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache with TTL."""
        return self.client.setex(key, ttl, json.dumps(value))

    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        return self.client.delete(key) > 0

    def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        return self.client.exists(key) > 0
