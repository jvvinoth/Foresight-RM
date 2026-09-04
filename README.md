# Foresight RM

**Julius Baer · Wealth Intelligence — SingHacks 2026 · Foresight Labs**

> Lau Chi Ming's apartment, his shares, his bond, his structured product, his loan and his career
> are one bet on Hong Kong property. **49.0% of his wealth, against a 10% mandate limit.**
> His bank shows six positions, every one inside its own limit, nothing flagged.
>
> His Relationship Manager worked it out herself on 5 March and typed it into a note:
> *"the perpetual, the shares, the accumulator and his own development business are all the same
> bet. He said that is why he is confident."*
>
> Nothing read that note against the portfolio. Nothing ever does.

Foresight RM reads the portfolio system, the credit system and the CRM **together**, then tells the
RM who to call, what changed, what could change next, and how to raise it with this particular
person.

```bash
git clone git@github.com:jvvinoth/Foresight-RM.git && cd Foresight-RM
cd frontend && npm install && npm run build && cp -r dist ../backend/static && cd ..
cd backend && pip install -r requirements.txt && uvicorn main:app --port 8010
```

Open **http://localhost:8010** → Sign in → **Lau Chi Ming** → **Exposure** → *Reveal correlated exposure*.

No API key required. Model outputs are cached in `backend/cache/` and committed.

---

## Judging Criteria

### Client-Centric Innovation

The **single-bet detector** finds correlated risk spanning the portfolio system, the credit system,
the derivatives book and the CRM. It resolves structured products through
`instruments.underlying_reference`, so a wrapper cannot hide an exposure — Hartono's fixed coupon
note is booked as sector *Multi*, and its basket contains **Bara Nusantara Energy**, the same
company that is already 41.4% of his portfolio.

The **gate** is the other half. A finding that is arithmetically correct but cannot be said today is
not an alert, it is a way to lose a client. Margarethe Voss-Brenner is 41 points over her equity
band *and* six months widowed, having asked that nothing be changed. The system reframes rather than
fires.

### User Experience & Design

One page per client. Priority before detail, evidence one click from any number, the person on the
left in every agent mode — a financial finding is never shown without the human it belongs to.
Julius Baer palette (`#141E55`), Spectral for display, IBM Plex Mono for every figure and file
reference.

Held findings stay on screen with their reason and revisit date. Nothing is silently dropped.

### Technical & Operational Feasibility

**Detectors compute. Agents narrate. No agent originates a number.**

Every figure is calculated in Python; the model only extracts from notes, writes prose and
translates. Market claims resolve against `event_log.csv`, which overrides anything the model
believes about 2026. Model calls are forced tool calls against a JSON schema and cached by input
hash, so the same inputs always produce the same audit trail — a compliance property, not a demo
trick.

Run `python backend/verify.py` to print every headline claim with the rows it came from.

### Strategic Impact

The rubric asks for *"preserving the central role of the Relationship Manager."* That is the
architecture, not a caveat: **Relationship is the only agent that can veto another agent's output.**
A financial finding can be suppressed by a human fact; never the reverse. Nothing reaches a client
without RM approval, and every approval is persisted with the original model draft beside the final
text.

The handover pack is the institutional case. Tan Boon Huat has been a client for 23 years. Today
that relationship lives in one person's head.

---

## The six agents

| # | Agent | Question | Kind |
|---|---|---|---|
| 01 | **Monitor** | What changed since you last looked? | Deterministic |
| 02 | **Exposure** | What is this client actually exposed to? | Deterministic |
| 03 | **Resilience** | What breaks first? | Deterministic |
| 04 | **Opportunity** | What is unclaimed? | Deterministic |
| 05 | **Suitability** | Is it a breach, or is it authorised? | Deterministic |
| 06 | **Relationship** | How should she say it — and should she? | Model |

Then **the Gate** (raise / reframe / hold / authorised) and **the Narrator** (prose and translation).
Neither is an agent, because neither discovers anything.

This maps to the four verbs in the build path: *continuously monitors* (01), *identifies risks and
opportunities* (02–04), *generates personalised recommendations* (05–06 → Gate), *supports better
RM-client conversations* (Narrator → RM).

---

## What it found

All figures computed from `data/` at the 2026-08-26 snapshot. Reproduce with `python backend/verify.py`.

| Finding | Figure | Source |
|---|---|---|
| Lau — one bet on Hong Kong real estate | **49.03%** core, 62.87% incl. adjacent | `holdings.csv`, sector Real Estate / region Hong Kong |
| Lau — margin proximity | LTV **69.41%** vs a 70.00% trigger; margin call at **−5%** | `credit_facilities.csv` CF-0002 |
| Hartono — a breach cured by an event, not an action | **78.50%** then 75.68% vs a 70% trigger, drawn unchanged at HKD 8,000,000 | `credit_facilities.csv` CF-0005, five snapshots |
| Hartono — look-through | 41.42% + 3.57% = **44.99%** Indonesia energy | FCN basket names Bara Nusantara Energy |
| Aishah — excluded holdings in a **discretionary** mandate | 11.13% + 10.17% | `sustainability_excluded = Y` inside `SUSBAL` |
| Alistair — the breach that is not a breach | Commodities 18.93% vs 0–10%, **waived** | note N-010, "confirmed the instruction in writing" |
| Andreas — the cost of not deciding | **USD 14.2m** cash, 45.0% vs an 18% ceiling | agreed Oct 2024 *and* Jun 2025, never executed |
| Ravi — a price that has not moved | **68.35%** of wealth marked 2025-09-30 | reviewed 30 Jun, deliberately unchanged |

---

## Data Integrity

`DATA_DICTIONARY.md` says the dataset contains deliberate production artefacts. A system that walks
into them is confidently wrong, which is worse than being silent. Each is handled in named code.

| Artefact | Naive result | What we report | Where |
|---|---|---|---|
| Custody accounts | 17 mandate breaches | **14** — custody carries no mandate | `loader.managed_holdings` |
| Concentration limits | Flags index funds and govvies | Single-name only | `detectors.suitability` |
| FX convention | JPY fees summed as USD | Converted at the snapshot rate | `loader.to_usd` |
| Bond quantity | Values inflated 100× | Supplied market values used directly | `loader` |
| Stale valuation | Reported as an error | Reported as an ageing mark | `detectors.monitor` |
| Missing cost basis | Estimates a gain | **Declines to advise** | `detectors.suitability` |
| Suitability waiver | Reports a breach | Reports it as authorised | `detectors.suitability.waivers` |
| Gated redemptions | Treats gated assets as sellable | Treats them as unavailable | `detectors.resilience` |

The missing-cost-basis case is the one worth reading: the tax lot history was not supplied when
Margarethe's portfolio transferred in, so no German inheritance tax figure can be defended. The
system says so instead of guessing.

---

## Architecture

```
data/ (12 files)  →  detectors/  →  gate.py  →  agents/narrator  →  RM approves  →  client
                     (deterministic)   ↑
                                agents/relationship  ← rm_notes.json
```

```
backend/
  loader.py        12 CSVs in memory · FX and quantity conventions applied once
  detectors/       monitor · exposure · resilience · opportunity · suitability
  agents/          base (cache + forced tool call) · relationship · narrator
  gate.py          raise / reframe / hold / authorised, and the ranking score
  engine.py        runs the book, applies the gate, ranks
  store.py         sqlite audit trail — the only write path
  verify.py        every claim, with its source rows
  integrity.py     the artefact register
frontend/src/
  api/client.ts    typed hooks, relative /api — no base URL to misconfigure
  pages/           Login · Dashboard · Client · Agents · Integrity
  components/      Reveal · Outlook · FindingCard · AgentStrip · Shell
```

**No database.** 20 clients, 24 portfolios, 206 current positions. pandas loads the lot in under
100ms; Postgres would buy migrations and a failure mode and nothing else. SQLite persists RM
approvals, because "the RM approved this" is a regulated fact.

**One service.** FastAPI serves the built React app, so the frontend calls `/api` relatively and
there is no CORS or environment variable to get wrong at 17:55.

### API

```
GET  /api/book                      20 clients ranked, with book statistics
GET  /api/clients/{id}              profile + relationship facts + constraints
GET  /api/clients/{id}/findings     findings with evidence and gate verdict
GET  /api/clients/{id}/reveal       look-through payload
GET  /api/clients/{id}/outlook      LTV path and collateral shocks
GET  /api/clients/{id}/brief        conversation brief
GET  /api/clients/{id}/handover     continuity pack
POST /api/clients/{id}/draft        client-language draft (the one live model call)
POST /api/clients/{id}/approve      persisted to the audit trail
GET  /api/agents/trace/{id}         which agent produced what, with timings
GET  /api/integrity                 the artefact register
GET  /docs                          OpenAPI
```

---

## Scope

**Built:** six agents, the gate, ranking across the full book, look-through, collateral shocks,
open-loop detection, waiver-aware suitability, evidence trail, conversation brief, handover pack,
audit trail, integrity register, `verify.py`.

**Not built:** authentication (bank SSO in production), meeting transcription (no transcript exists
in the dataset), tax optimisation, trade execution, autonomous client contact. Birthday and family
milestone alerts are deliberately absent — there is no date of birth in the data, and we would
rather say so than fake it.

---

All client data is synthetic, supplied by Julius Baer for SingHacks 2026. Figures are computed from
the challenge dataset at the 26 August 2026 snapshot. Not investment advice.
