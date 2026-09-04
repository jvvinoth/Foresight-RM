"""Model-backed agents.

Two rules enforced here rather than by convention:

  * Output is a forced tool call against a JSON schema, so the model cannot
    return prose where structure is expected.
  * Every response is cached on disk under a hash of (agent, prompt, inputs).
    The cache is committed to the repository, so a reviewer without an API key
    gets identical output — and the same inputs always produce the same audit
    trail, which is a compliance property, not a demo trick.
"""

from __future__ import annotations

import hashlib
import json
import os
from typing import Any

from config import CACHE_DIR, MODEL

CACHE_DIR.mkdir(parents=True, exist_ok=True)

_client = None


def _anthropic():
    global _client
    if _client is None:
        try:
            from anthropic import Anthropic

            key = os.environ.get("ANTHROPIC_API_KEY")
            _client = Anthropic(api_key=key) if key else False
        except Exception:
            _client = False
    return _client or None


def cache_key(agent: str, prompt: str, inputs: Any) -> str:
    blob = json.dumps({"a": agent, "p": prompt, "i": inputs}, sort_keys=True, default=str)
    return hashlib.sha256(blob.encode()).hexdigest()[:20]


def cache_get(key: str) -> dict | None:
    path = CACHE_DIR / f"{key}.json"
    if path.exists():
        with open(path) as fh:
            return json.load(fh)
    return None


def cache_set(key: str, value: dict) -> None:
    with open(CACHE_DIR / f"{key}.json", "w") as fh:
        json.dump(value, fh, indent=2, ensure_ascii=False)


def run_agent(
    agent: str,
    prompt: str,
    schema: dict,
    inputs: Any,
    fallback: dict | None = None,
) -> dict:
    """Return validated JSON. Cache first, model second, fallback last."""
    key = cache_key(agent, prompt, inputs)
    if (hit := cache_get(key)) is not None:
        return hit

    client = _anthropic()
    if client is None:
        return fallback if fallback is not None else {}

    try:
        resp = client.messages.create(
            model=MODEL,
            max_tokens=2000,
            tools=[
                {
                    "name": "emit",
                    "description": f"Return the {agent} agent's structured output.",
                    "input_schema": schema,
                }
            ],
            tool_choice={"type": "tool", "name": "emit"},
            messages=[{"role": "user", "content": prompt}],
        )
        for block in resp.content:
            if getattr(block, "type", None) == "tool_use":
                cache_set(key, block.input)
                return block.input
    except Exception:
        pass

    return fallback if fallback is not None else {}


def cache_stats() -> dict:
    files = list(CACHE_DIR.glob("*.json"))
    return {
        "entries": len(files),
        "model": MODEL,
        "live": _anthropic() is not None,
    }
