"""Audit trail for RM approvals.

The only write path in the system. Persisted because "the RM approved this"
is a regulated fact: the original model draft is kept alongside whatever the
RM edited it to, with a timestamp and their id.

sqlite3 from the stdlib. No ORM, no migrations, no server.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone

from config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS approvals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ts          TEXT NOT NULL,
    rm_id       TEXT NOT NULL,
    client_id   TEXT NOT NULL,
    finding_ids TEXT NOT NULL,
    action      TEXT NOT NULL,
    ai_draft    TEXT NOT NULL,
    final_text  TEXT NOT NULL
);
"""


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(SCHEMA)
    return conn


def record(
    rm_id: str,
    client_id: str,
    finding_ids: list[str],
    action: str,
    ai_draft: str,
    final_text: str,
) -> dict:
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with _conn() as conn:
        cur = conn.execute(
            "INSERT INTO approvals (ts, rm_id, client_id, finding_ids, action, ai_draft, final_text)"
            " VALUES (?,?,?,?,?,?,?)",
            (ts, rm_id, client_id, json.dumps(finding_ids), action, ai_draft, final_text),
        )
        return {
            "id": cur.lastrowid,
            "ts": ts,
            "action": action,
            "edited": final_text.strip() != ai_draft.strip(),
        }


def history(client_id: str | None = None, limit: int = 50) -> list[dict]:
    with _conn() as conn:
        if client_id:
            rows = conn.execute(
                "SELECT * FROM approvals WHERE client_id=? ORDER BY id DESC LIMIT ?",
                (client_id, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM approvals ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
    return [
        {
            **dict(r),
            "finding_ids": json.loads(r["finding_ids"]),
            "edited": r["final_text"].strip() != r["ai_draft"].strip(),
        }
        for r in rows
    ]
