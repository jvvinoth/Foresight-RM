#!/usr/bin/env python3
"""Pre-computes every model-backed response and writes it to backend/cache/.

    python backend/warm_cache.py

The cache is committed to the repository, so a reviewer without an API key
sees exactly what we saw, and the live demo makes no network call it cannot
afford to lose. Same inputs, same output, same audit trail.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import engine  # noqa: E402
from agents import narrator  # noqa: E402
from agents.base import cache_stats  # noqa: E402
from loader import clients  # noqa: E402


def main() -> None:
    stats = cache_stats()
    if not stats["live"]:
        print("No ANTHROPIC_API_KEY — nothing to warm. Agents will use fallbacks.")
        return

    print(f"Warming with {stats['model']}. Starting from {stats['entries']} cached entries.\n")
    ids = list(clients["client_id"])

    for i, cid in enumerate(ids, 1):
        res = engine.run_client(cid)          # relationship agent
        rel = res["relationship"]
        narrator.brief(cid, res["findings"], rel)   # brief prose
        draft = narrator.draft(cid, res["findings"], rel)  # client-language message
        body = str(draft.get("body", ""))
        print(
            f"  {i:>2}/{len(ids)}  {rel['name'][:26]:26} {rel['language'][:19]:19}"
            f" draft {len(body):>4} chars"
        )

    print(f"\nCache now holds {cache_stats()['entries']} entries.")
    print("Commit backend/cache/ so the demo runs without a key.")


if __name__ == "__main__":
    main()
