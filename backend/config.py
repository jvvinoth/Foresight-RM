"""Shared constants. The snapshot date is the dataset's 'today'."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CACHE_DIR = Path(__file__).resolve().parent / "cache"
STATIC_DIR = Path(__file__).resolve().parent / "static"
DB_PATH = Path(__file__).resolve().parent / "audit.db"

SNAPSHOTS = [
    "2025-12-31",
    "2026-02-27",
    "2026-03-31",
    "2026-06-30",
    "2026-08-26",
]
TODAY = SNAPSHOTS[-1]
PRIOR = SNAPSHOTS[-2]

RM_ID = "RM-SG-014"

# Service models that carry a mandate. Custody accounts are not managed by the
# bank and are explicitly not measured against one (DATA_DICTIONARY.md).
MANDATED_SERVICE_MODELS = {"Discretionary", "Advisory"}

# Collateral shocks applied to lending value for the outlook view.
SHOCKS = [0.0, -0.05, -0.10, -0.15, -0.20]

MODEL = "claude-sonnet-5"
