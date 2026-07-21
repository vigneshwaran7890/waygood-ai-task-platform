import json
import logging
import signal
import sys
import time

import redis

from app.config import (
    BLOCKING_TIMEOUT_SECONDS,
    REDIS_TASK_QUEUE,
    REDIS_URL,
    WORKER_ID,
)
from app.operations import UnsupportedOperationError, run_operation
from app.repository import TaskNotFoundError, TaskRepository

logging.basicConfig(
    level=logging.INFO,
    format=f"%(asctime)s [{WORKER_ID}] %(levelname)s %(message)s",
)
logger = logging.getLogger(WORKER_ID)

_running = True


def _handle_shutdown(signum, _frame):
    global _running
    logger.info("Received signal %s, finishing current task then exiting", signum)
    _running = False


signal.signal(signal.SIGTERM, _handle_shutdown)
signal.signal(signal.SIGINT, _handle_shutdown)


def process_task(repo: TaskRepository, task_id: str) -> None:
    try:
        task = repo.get_task(task_id)
    except TaskNotFoundError as exc:
        logger.error("Skipping missing task %s: %s", task_id, exc)
        return

    operation_type = task["operationType"]
    input_text = task["inputText"]

    logger.info("Processing task %s (operation=%s)", task_id, operation_type)
    repo.mark_running(task_id, f"Worker {WORKER_ID} picked up task")

    try:
        result = run_operation(operation_type, input_text)
    except UnsupportedOperationError as exc:
        logger.error("Task %s failed: %s", task_id, exc)
        repo.mark_failed(task_id, str(exc), f"Failed: {exc}")
        return
    except Exception as exc:  # noqa: BLE001 - any processing failure must be captured on the task
        logger.exception("Task %s raised an unexpected error", task_id)
        repo.mark_failed(task_id, str(exc), f"Failed with unexpected error: {exc}")
        return

    repo.mark_success(task_id, result, "Task completed successfully")
    logger.info("Task %s completed successfully", task_id)


def run() -> None:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    repo = TaskRepository()

    logger.info("Worker started, listening on queue '%s'", REDIS_TASK_QUEUE)

    while _running:
        try:
            item = redis_client.brpop(REDIS_TASK_QUEUE, timeout=BLOCKING_TIMEOUT_SECONDS)
        except redis.exceptions.ConnectionError as exc:
            logger.error("Redis connection error, retrying in 3s: %s", exc)
            time.sleep(3)
            continue

        if item is None:
            continue

        _, raw_payload = item
        try:
            payload = json.loads(raw_payload)
            task_id = payload["taskId"]
        except (json.JSONDecodeError, KeyError) as exc:
            logger.error("Discarding malformed queue message %r: %s", raw_payload, exc)
            continue

        process_task(repo, task_id)

    logger.info("Worker shut down cleanly")


if __name__ == "__main__":
    try:
        run()
    except Exception:  # noqa: BLE001 - top-level guard so the container logs before exiting
        logger.exception("Worker crashed")
        sys.exit(1)
