# Foresight RM

**Julius Baer · Wealth Intelligence — SingHacks 2026 · Foresight Labs**

> Lau Chi Ming's apartment, his shares, his bond, his structured product, his loan and his career
> are the same bet on Hong Kong property. His bank shows six healthy lines, each inside its own
> limit. His RM worked it out herself in March and typed it into a note nobody reads.

Foresight RM reads the portfolio system, the credit system and the CRM together, then tells the
Relationship Manager who to call, what changed, what could change next, and how to raise it with
this particular person.

---

## Status

| Part | State |
|---|---|
| Frontend | Built — five screens, full mock data |
| Backend | Not started (FastAPI + pandas, next) |

The frontend reads `src/data/mock.ts`, which mirrors the shape the API will return. Swapping in the
real backend is a change of data source, not of components.

## Run it

```bash
cd frontend && npm install && npm run dev
```

Sign-in is pre-filled — press **Sign in**.

## Screens

| Route | What it is |
|---|---|
| `/` | RM sign-in. Bank SSO in production; identity scopes the book |
| `/dashboard` | **Priority Radar** — 20 clients ranked by what needs attention, not by size |
| `/client/:id` | **Client 360** — the person on the left, agent findings on the right, evidence attached |
| `/agents` | **Agent architecture** — six agents mapped to the four verbs in the challenge brief |
| `/integrity` | **Data integrity** — the seven dataset artefacts and how each is handled |

Start at `/client/CL-0014` → **Exposure** tab → **Reveal correlated exposure**. That is the demo.

## The six agents

| # | Agent | Question | Kind |
|---|---|---|---|
| 01 | Monitor | What changed since you last looked? | Deterministic |
| 02 | Exposure | What is this client actually exposed to? | Deterministic |
| 03 | Resilience | What breaks first? | Deterministic |
| 04 | Opportunity | What is unclaimed? | Deterministic |
| 05 | Suitability | Is it a breach, or is it authorised? | Deterministic |
| 06 | Relationship | How should she say it — and should she? | Model |

Then **the Gate** (raise / reframe / hold) and **the Narrator** (prose and translation). Neither is
an agent, because neither discovers anything.

**Relationship is the only agent that can veto another agent's output.** A financial finding can be
suppressed by a human fact; never the reverse.

## Design rules

- The model never originates a number. Every figure is computed; every event cites `event_log.csv`.
- Every finding carries its file, its row, and where relevant a dated, attributed RM note.
- A held finding is shown as held, with a reason and a revisit date. Nothing is silently dropped.
- The person stays on screen in every agent mode. A financial finding is never shown alone.
- Client-facing output is generated in the client's `reporting_language` and is a draft until the RM
  approves it.

## Stack

Vite · React 18 · TypeScript · Tailwind v4 · react-router · lucide-react. No chart library — the
convergence bar and the LTV shock chart are plain CSS. No animation library — CSS transitions only,
so nothing is ever parked invisible waiting on a frame.

Palette is Julius Baer: primary `#141E55`, neutral `#CCD0D1`, white. Spectral for display, Inter for
body, IBM Plex Mono for figures and references.

## Next

- FastAPI backend (`/backend`) — pandas loader, the six detectors, the gate, the narrator
- `verify.py` — prints every headline claim with its source rows
- SQLite audit trail for RM approvals
- Serve `frontend/dist` from FastAPI as one Railway service, so there is no CORS to misconfigure

---

All client data is synthetic, supplied by Julius Baer for SingHacks 2026. Figures are computed from
the challenge dataset at the 26 August 2026 snapshot. Not investment advice.
