import json
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path


class JobStore:
    def __init__(self, data: Path):
        data.mkdir(parents=True, exist_ok=True)
        self.path = data / "jobs.sqlite3"
        with self.connect() as db:
            db.execute(
                "CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, "
                "request_id TEXT UNIQUE NOT NULL, fingerprint TEXT NOT NULL, "
                "snapshot TEXT NOT NULL)"
            )

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        try:
            with db:
                yield db
        finally:
            db.close()

    def get(self, job_id):
        with self.connect() as db:
            row = db.execute("SELECT snapshot FROM jobs WHERE id=?", (job_id,)).fetchone()
        return json.loads(row[0]) if row else None

    def by_request(self, request_id):
        with self.connect() as db:
            row = db.execute(
                "SELECT fingerprint,snapshot FROM jobs WHERE request_id=?", (request_id,)
            ).fetchone()
        return (row[0], json.loads(row[1])) if row else None

    def request_key(self, job_id):
        with self.connect() as db:
            row = db.execute("SELECT request_id FROM jobs WHERE id=?", (job_id,)).fetchone()
        if row is None:
            raise KeyError(job_id)
        return row[0]

    def list(self):
        with self.connect() as db:
            rows = db.execute("SELECT snapshot FROM jobs ORDER BY rowid DESC LIMIT 50").fetchall()
        return [json.loads(row[0]) for row in rows]

    def create(self, request_id, fingerprint, name, draft_id):
        snapshot = {
            "id": uuid.uuid4().hex,
            "revision": 1,
            "status": "queued",
            "stage": None,
            "name": name,
            "draftId": draft_id,
            "createdAt": time.time(),
            "updatedAt": time.time(),
            "error": None,
            "result": None,
        }
        with self.connect() as db:
            db.execute(
                "INSERT INTO jobs VALUES (?,?,?,?)",
                (snapshot["id"], request_id, fingerprint, json.dumps(snapshot)),
            )
        return snapshot

    def count(self):
        with self.connect() as db:
            return db.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]

    def update(self, job_id, **changes):
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT snapshot FROM jobs WHERE id=?", (job_id,)).fetchone()
            if not row:
                raise KeyError(job_id)
            value = json.loads(row[0])
            value.update(changes)
            value.update(revision=value["revision"] + 1, updatedAt=time.time())
            db.execute("UPDATE jobs SET snapshot=? WHERE id=?", (json.dumps(value), job_id))
        return value

    def recover(self):
        from .failures import failure_details
        from .locking import exclusive

        try:
            with exclusive(self.path.parent / "worker.lock"):
                with self.connect() as db:
                    rows = db.execute("SELECT snapshot FROM jobs").fetchall()
                for row in rows:
                    job = json.loads(row[0])
                    if job["status"] in ("running", "queued"):
                        details = failure_details(
                            self.path.parent / "jobs" / job["id"],
                            InterruptedError(),
                            job.get("stage"),
                        )
                        self.update(job["id"], status="failed", **details)
        except OSError:
            # An orphaned worker still owns execution; do not overwrite its state.
            return
