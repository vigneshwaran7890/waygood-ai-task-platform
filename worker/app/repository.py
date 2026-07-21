from datetime import UTC, datetime

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import MongoClient

from app.config import MONGO_URI


class TaskNotFoundError(Exception):
    pass


class TaskRepository:
    def __init__(self, mongo_uri: str = MONGO_URI):
        self._client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
        self._db = self._client.get_default_database()
        self._tasks = self._db["tasks"]

    def ping(self) -> bool:
        self._client.admin.command("ping")
        return True

    def get_task(self, task_id: str) -> dict:
        try:
            oid = ObjectId(task_id)
        except InvalidId as exc:
            raise TaskNotFoundError(f"Invalid task id: {task_id}") from exc

        task = self._tasks.find_one({"_id": oid})
        if task is None:
            raise TaskNotFoundError(f"Task not found: {task_id}")
        return task

    def mark_running(self, task_id: str, message: str) -> None:
        self._tasks.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {"status": "RUNNING", "startedAt": datetime.now(UTC)},
                "$push": {"logs": self._log_entry(message)},
            },
        )

    def mark_success(self, task_id: str, result: str, message: str) -> None:
        self._tasks.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "status": "SUCCESS",
                    "result": result,
                    "completedAt": datetime.now(UTC),
                },
                "$push": {"logs": self._log_entry(message)},
            },
        )

    def mark_failed(self, task_id: str, error_message: str, message: str) -> None:
        self._tasks.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "status": "FAILED",
                    "errorMessage": error_message,
                    "completedAt": datetime.now(UTC),
                },
                "$push": {"logs": self._log_entry(message, level="ERROR")},
            },
        )

    def append_log(self, task_id: str, message: str, level: str = "INFO") -> None:
        self._tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$push": {"logs": self._log_entry(message, level=level)}},
        )

    @staticmethod
    def _log_entry(message: str, level: str = "INFO") -> dict:
        return {
            "timestamp": datetime.now(UTC),
            "level": level,
            "message": message,
        }
