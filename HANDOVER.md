# Handover — Foresight RM

Everything a second developer needs to start contributing in fifteen minutes.
Read this, then `README.md` for the product argument.

---

## 1. Run it

```bash
git clone git@github.com:jvvinoth/Foresight-RM.git && cd Foresight-RM

# backend — port 8000 is taken on Vinoth's machine, we standardised on 8010
cd backend
pip install -r requirements.txt
uvicorn main:app --port 8010 --reload

# frontend — separate terminal, proxies /api to :8010
cd frontend
npm install
npm run dev
```

Frontend on `http://localhost:5173`, API on `http://localhost:8010`.
`http://localhost:8010/docs` is the live OpenAPI page.

**No API key needed.** 60 model responses are committed in `backend/cache/`.
To regenerate them: put `ANTHROPIC_API_KEY=...` in `backend/.env`, then
`python backend/warm_cache.py`. Never commit `.env` — it is git-ignored.

---

## 2. The one architectural rule

> **Detectors compute. Agents narrate. No agent originates a number.**

Every percentage, ratio and currency figure is calculated in Python from the
CSVs. The model only extracts from RM notes, writes prose, and translates.
Market claims resolve against `event_log.csv`, which overrides anything the
model believes about 2026.

If you add a feature, ask which side of that line it sits on. A model that
invents a portfolio number in front of a Julius Baer judge ends the run.

---

## 3. Shape of the code

```
data/                       12 challenge CSVs + rm_notes.json (committed)
backend/
  config.py                 snapshot dates, paths, loads .env
  loader.py                 all files in memory; FX + bond conventions applied once
  schemas.py                the Finding contract — everything the UI renders
  detectors/                deterministic, no LLM
    monitor.py              what changed across snapshots; stale marks
    exposure.py             look-through, (sector, region) clustering — the hero
    resilience.py           LTV path, cured-vs-fixed breaches, shocks, liquidity
    opportunity.py          idle cash, open loops, contradicted intent, plans
    suitability.py          bands by service model, waivers, binding exclusions
  agents/
    base.py                 cached forced-tool-call wrapper
    relationship.py         constraints, tone, entry point — can veto the gate
    narrator.py             brief prose + client-language draft
  gate.py                   raise / reframe / hold / authorised, and the score
  engine.py                 runs a client, applies the gate, ranks the book
  store.py                  sqlite audit trail — the only write path
  verify.py                 prints every claim with its source rows
  integrity.py              the dataset-artefact register
frontend/src/
  api/client.ts             typed hooks; relative /api, no base URL
  pages/                    Login · Dashboard · Client · Agents · Integrity
  components/               Reveal · Outlook · FindingCard · AgentStrip
                            Shell · DeviceFrame (iPad) · ui
```

### How a request flows

```
GET /api/clients/CL-0014/findings
  → engine.run_client
      → 5 detectors, each returning Finding objects   (deterministic)
      → relationship.profile                          (cached model call)
      → gate.apply on every finding                   (rules over relationship)
      → sort by gate.score
  → [Finding.to_dict()]
```

`engine.run_client` is `lru_cache`d and the whole book is warmed at startup, so
after boot every request is served from memory.

---

## 4. Adding a detector — the only pattern you need

```python
# backend/detectors/mything.py
from schemas import Evidence, Finding, Metric
from loader import client_holdings

def detect(client_id: str) -> list[Finding]:
    ...                                   # compute in Python, never in a prompt
    return [Finding(
        id=f"MINE-{client_id}",
        client_id=client_id,
        agent="opportunity",              # must be one of the six agent ids
        tense="now",                      # now | next | act
        severity="high",                  # critical | high | medium | info
        title="Short, human",
        headline="One sentence with the number in it.",
        body="A paragraph the RM could read aloud.",
        evidence=[Evidence("file", "holdings.csv", "3 rows · 2026-08-26", "what it shows")],
        metrics=[Metric("Label", "49.0%", alert=True, sub="context")],
        materiality=0.8,                  # 0-1, how big
        urgency=0.6,                      # 0-1, how soon
    )]
```

Then register it in `engine.DETECTORS`. The gate, ranking, UI card and evidence
rail all work with no further changes.

**Every finding must carry evidence.** A finding the RM cannot defend is not
usable, and the evidence rail is a scored part of the demo.

---

## 5. Where the numbers come from

Run `python backend/verify.py` to print all of this with source rows.

| Claim | Figure | Client |
|---|---|---|
| One bet, Hong Kong real estate | 49.03% core, 62.87% incl. adjacent | Lau Chi Ming |
| Margin proximity | LTV 69.41% vs 70.00%; margin call at −5% | Lau |
| Breach cured by an event, not an action | 78.50% → cleared, drawn unchanged at HKD 8m | Hartono |
| Look-through | FCN basket names Bara Nusantara Energy → 44.99% | Hartono |
| Excluded holdings in a **discretionary** mandate | 11.13% + 10.17% | Aishah |
| The breach that is not a breach | Commodities 18.93%, waiver on file | Alistair |
| Cost of not deciding | USD 14.2m cash, benchmark +9.1% | Andreas |
| A price that has not moved | 68.35% marked 2025-09-30 | Ravi |

---

## 6. Dataset traps — do not undo these

`docs/DATA_DICTIONARY.md` plants deliberate artefacts. Each is handled in named
code and listed in `backend/integrity.py`. If you touch these areas, keep the
handling.

| Trap | Rule | Where |
|---|---|---|
| Custody accounts | Carry no mandate — excluded from band checks | `loader.managed_holdings` |
| Concentration | Applies only where `concentration_limit_applies = Y` | `detectors.suitability` |
| FX | `USDJPY` is JPY per USD; `EURUSD` is USD per EUR | `loader.to_usd` |
| Bond quantity | Units of 100 nominal — use supplied market values | `loader` |
| Private marks | Lag a quarter. Ageing, not an error | `detectors.monitor` |
| Missing cost basis | Never estimate a gain | `detectors.suitability` |
| Waivers | Read the notes *before* flagging a breach | `suitability.waivers` |
| Gated redemptions | Gated assets are unavailable, not slow | `resilience.GATED_TIERS` |

---

## 7. Frontend conventions

- **Container queries, not media queries.** `Shell` is the `@container`; use
  `@2xl:` / `@4xl:` variants. Window breakpoints break the iPad frame, which is
  a real 834×1194 viewport inside a wider browser window.
- **No animation library.** CSS transitions only. Nothing may be parked at
  `opacity: 0` waiting on a frame — content must be readable at rest.
- **shadcn styling is deliberately not used.** Its default look reads as
  generated. Hand-styled surfaces, Julius Baer navy `#141E55`, Spectral for
  display, IBM Plex Mono for every figure and file reference.
- **Strips scroll, they do not wrap** — no orphan cells at narrow widths.

---

## 8. Deployment

Railway builds `Dockerfile` at repo root on every push to `main`. Two stages:
node builds the React app, Python serves it from the same origin, so there is
no CORS and no API base URL in production.

- Root Directory: `/` · Branch: `main` · Auto Deploy: on · Wait for CI: **off**
- Health check: `/api/health`
- `ANTHROPIC_API_KEY` in Railway Variables enables the live draft button; the
  cache covers everything else

⚠️ `backend/audit.db` is ephemeral on Railway — approvals do not survive a
redeploy. Fine for the demo; say "the bank's system of record" in production.

Test the exact production image locally:

```bash
docker build -t foresight-rm . && docker run --rm -p 9099:9099 -e PORT=9099 foresight-rm
```

---

## 9. Open work

| Priority | Task | Owner |
|---|---|---|
| 🔴 | Dashboard redesign — 3 hero cards, relationship strip, collapsed table | frontend |
| 🔴 | `GET /api/relationship-desk` — neglected clients, anniversary+KYC, jurisdiction holidays | backend |
| 🟠 | Naive-vs-Foresight toggle — same engine with the gate and integrity rules disabled | both |
| 🟠 | Collapse client-page findings by default (the first currently force-expands) | frontend |
| 🟡 | Audit trail panel — `GET /api/approvals` exists, no screen shows it | frontend |
| 🟡 | `brief.one_number` returns `—` when the top finding has no metric | backend |
| 🟡 | Capitalisation in generated entry points ("the eur 3,400,000 german…") | backend |

### Interface contract for `/api/relationship-desk`

Agree this first so frontend never waits on backend:

```json
{
  "neglected":  [{ "id": "CL-0005", "name": "…", "days": 196, "aumUsd": 19402000, "reason": "…" }],
  "milestones": [{ "id": "CL-0008", "name": "…", "date": "2026-09-11", "years": 11, "kycSameDay": true }],
  "holidays":   [{ "name": "Mid-Autumn Festival", "date": "2026-09-25",
                   "jurisdiction": "Hong Kong", "clients": [{ "id": "CL-0014", "name": "…" }] }]
}
```

Two real findings behind it: **the KYC review date sits on the relationship
anniversary** for several clients — one call serves both. And **there is no
date of birth in the dataset**, so birthday features are not buildable. Use the
anniversary instead; never invent dates.

For holidays, surface **public holidays in the client's booking centre** and let
the RM choose. Do not infer religion from nationality or from a name.

---

## 10. Ground rules

1. Never invent a number, a date, or a client fact. If the data does not support
   it, say so on screen — that honesty is a scored feature, not a gap.
2. Every finding carries evidence: file, row, and where relevant a dated,
   attributed RM note.
3. A finding that cannot be raised is shown as **held**, with a reason and a
   revisit date. It is never silently dropped.
4. Nothing reaches a client without RM approval.
5. Run `python backend/verify.py` before you change a headline figure anywhere.

---

*Synthetic data supplied by Julius Baer for SingHacks 2026. Not investment advice.*
