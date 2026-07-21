import os

from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/ai_task_platform")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
REDIS_TASK_QUEUE = os.environ.get("REDIS_TASK_QUEUE", "ai:tasks:queue")
WORKER_ID = os.environ.get("WORKER_ID", "worker-1")
BLOCKING_TIMEOUT_SECONDS = int(os.environ.get("BLOCKING_TIMEOUT_SECONDS", "5"))
