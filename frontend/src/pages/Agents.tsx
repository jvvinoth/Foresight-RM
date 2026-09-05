import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  CalendarClock,
  ChevronDown,
  FileText,
  Gavel,
  Hand,
  Layers,
  Play,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Users,
} from 'lucide-react'
import { Eyebrow } from '../components/ui'
import { AGENTS } from '../data/agents'
import { useDesk, useDeskRoster, type DeskConflict } from '../api/client'
import type { AgentId } from '../types'

const ICON: Record<AgentId, typeof Activity> = {
  monitor: Activity,
  exposure: Layers,
  resilience: TrendingDown,
  opportunity: Sparkles,
  suitability: ShieldCheck,
  relationship: Users,
}

/** Who each agent is, in the language of a private bank. */
const ROLE: Record<AgentId, string> = {
  monitor: 'The night shift. Diffs every portfolio while nobody is looking.',
  exposure: 'The analyst. Opens the wrappers and adds up what is really there.',
  resilience: 'The stress tester. Asks what breaks first, and at what level.',
  opportunity: 'The commercial one. Finds what is unclaimed, and what was promised.',
  suitability: 'The compliance officer. Knows the mandate. Has never met the client.',
  relationship: 'The one who has actually met them. Can overrule everyone at this table.',
}

const VERDICT: Record<
  DeskConflict['verdict']['gate'],
  { label: string; border: string; bg: string; text: string; lead: string }
> = {
  raise: {
    label: 'Raise now',
    border: 'border-signal-critical/35',
    bg: 'bg-signal-critical/5',
    text: 'text-signal-critical',
    lead: 'So open on',
  },
  reframe: {
    label: 'Reframe',
    border: 'border-signal-warn/35',
    bg: 'bg-signal-warn/5',
    text: 'text-signal-warn',
    lead: 'So open on',
  },
  hold: {
    label: 'Hold',
    border: 'border-signal-good/35',
    bg: 'bg-signal-good/5',
    text: 'text-signal-good',
    lead: 'Raise nothing. When you do speak, open on',
  },
  authorised: {
    label: 'Authorised',
    border: 'border-jb-200',
    bg: 'bg-jb-50',
    text: 'text-jb-600',
    lead: 'No action needed',
  },
}

const KIND_LABEL: Record<DeskConflict['objection']['kind'], string> = {
  legal: 'Legal bar',
  instruction: 'Client instruction',
  human: 'Human judgement',
  documented: 'Documented in writing',
}

export default function Agents() {
  const roster = useDeskRoster()
  const [params] = useSearchParams()
  const [clientId, setClientId] = useState(params.get('client') ?? '')
  const [step, setStep] = useState(0)
  const desk = useDesk(clientId)

  useEffect(() => {
    if (!clientId && roster.data?.clients.length) setClientId(roster.data.clients[0].id)
  }, [roster.data, clientId])

  const run = () => {
    setStep(0)
    AGENTS.forEach((_, i) => setTimeout(() => setStep(i + 1), 220 + i * 260))
    setTimeout(() => setStep(AGENTS.length + 1), 220 + AGENTS.length * 260)
  }

  useEffect(() => {
    if (desk.data) run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desk.data?.client.id])

  const running = step > 0 && step <= AGENTS.length
  const settled = step > AGENTS.length
  const traceFor = (id: string) => desk.data?.trace.find((t) => t.agent === id)

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>The Desk</Eyebrow>
          <h1 className="page-title mt-2">Six specialists, one client</h1>
          <p className="lede-type mt-3 max-w-[66ch]">
            Each agent reviews the same client from its own discipline. Where one of them objects, a
            rule decides — and the rule always lets the human fact win.
          </p>
        </div>
        <button
          onClick={run}
          disabled={running || !desk.data}
          className="inline-flex items-center gap-2 rounded bg-jb-900 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-jb-800 disabled:opacity-50"
        >
          <Play size={14} /> {running ? 'Running…' : 'Run the desk'}
        </button>
      </div>

      {/* who is in front of the desk */}
      <div className="flex flex-col gap-3">
        <Eyebrow>Clients where an agent was overruled · {roster.data?.clients.length ?? '—'}</Eyebrow>
        <div className="thin-scroll flex gap-2 overflow-x-auto pb-1">
          {(roster.data?.clients ?? []).map((c) => {
            const v = VERDICT[c.gate]
            const on = c.id === clientId
            return (
              <button
                key={c.id}
                onClick={() => setClientId(c.id)}
                className={`min-w-[190px] shrink-0 rounded border px-4 py-3 text-left transition-colors ${
                  on ? 'border-jb-900 bg-jb-900 text-white' : `${v.border} bg-white hover:bg-jb-50`
                }`}
              >
                <div className="truncate text-[13.5px] font-medium leading-tight">{c.name}</div>
                <div className={`mt-1 text-[11px] ${on ? 'text-white/60' : v.text}`}>
                  {v.label} · {c.conflicts} overruled
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <Pipeline step={step} traceFor={traceFor} />

      {/* what each specialist found */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <Eyebrow>Round the table</Eyebrow>
          {desk.data && (
            <span className="font-mono text-[10.5px] text-jb-400">
              {desk.data.client.name} · {desk.data.client.riskProfile} ·{' '}
              {desk.data.client.tenureYears} yrs · {desk.data.client.language}
            </span>
          )}
        </div>

        <div className="grid gap-px overflow-hidden rounded border border-iron-400 bg-iron-400 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {AGENTS.map((a, i) => {
            const Icon = ICON[a.id]
            const reported = step > i
            const found = desk.data?.findingsByAgent[a.id] ?? []
            const isChair = a.id === 'relationship'
            return (
              <div
                key={a.id}
                className={`flex flex-col gap-2.5 p-6 transition-colors duration-500 ${
                  reported ? (isChair ? 'bg-signal-gold/5' : 'bg-white') : 'bg-iron-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                      reported ? (isChair ? 'bg-signal-gold/15' : 'bg-jb-50') : 'bg-iron-300'
                    }`}
                  >
                    <Icon
                      size={14}
                      strokeWidth={1.9}
                      className={
                        reported ? (isChair ? 'text-signal-gold' : 'text-jb-600') : 'text-jb-300'
                      }
                    />
                  </span>
                  <span className="text-[14.5px] font-medium leading-tight text-jb-900">
                    {a.name}
                  </span>
                </div>

                <p className="text-[12.5px] leading-snug text-jb-500">{ROLE[a.id]}</p>

                <div className="mt-auto border-t border-iron-300 pt-2.5 text-[13px] leading-snug">
                  {!reported ? (
                    <span className="text-jb-300">waiting…</span>
                  ) : isChair ? (
                    <span className="text-jb-700">
                      {desk.data?.constraints.length
                        ? `${desk.data.constraints.length} constraint${
                            desk.data.constraints.length === 1 ? '' : 's'
                          } on file`
                        : 'No constraint on file'}
                    </span>
                  ) : found.length ? (
                    <span className="text-jb-700">{found[0].title}</span>
                  ) : (
                    <span className="text-jb-300">Nothing above threshold</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* the objection, and everything it reshaped */}
      {settled && desk.data && desk.data.conflicts.length > 0 && (
        <div className="flex flex-col gap-4">
          <div>
            <Eyebrow>What the human fact changed</Eyebrow>
            <p className="lede-type mt-2 max-w-[70ch]">
              One sentence in a note can reshape several findings at once. Each block below is a
              single objection, and everything it overruled.
            </p>
          </div>
          {desk.data.conflicts.map((c) => (
            <Conflict key={c.key} c={c} clientId={desk.data!.client.id} />
          ))}
        </div>
      )}

      <div className="rounded border border-jb-200 bg-jb-50 p-8">
        <Eyebrow>The rule at this table</Eyebrow>
        <p className="section-title mt-3 max-w-[62ch] leading-relaxed">
          Relationship is the only agent that can veto another. A financial finding can be suppressed
          by a human fact — never the reverse.
        </p>
      </div>
    </div>
  )
}

/** Six nodes on one rail. The line fills as each specialist reports in. */
function Pipeline({
  step,
  traceFor,
}: {
  step: number
  traceFor: (id: string) => { ms: number } | undefined
}) {
  const done = Math.min(step, AGENTS.length)
  const pct = (done / AGENTS.length) * 100

  return (
    <div className="surface p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Eyebrow>The run</Eyebrow>
        <span className="font-mono text-[10.5px] text-jb-400">
          {done}/{AGENTS.length} reported
          {step > AGENTS.length ? ' · gate applied' : ''}
        </span>
      </div>

      <div className="thin-scroll mt-6 overflow-x-auto pb-2">
        <div className="relative flex min-w-[660px] items-start">
          {/* rail */}
          <div className="absolute left-0 right-[92px] top-[13px] h-px bg-iron-400" />
          <div
            className="absolute left-0 top-[13px] h-px bg-jb-600 transition-[width] duration-500 ease-out"
            style={{ width: `calc((100% - 92px) * ${pct / 100})` }}
          />

          {AGENTS.map((a, i) => {
            const reported = step > i
            const active = step === i + 1
            const t = traceFor(a.id)
            return (
              <div key={a.id} className="relative flex flex-1 flex-col items-start gap-2">
                <span
                  className={`relative z-10 flex h-[27px] w-[27px] items-center justify-center rounded-full border transition-all duration-300 ${
                    reported
                      ? 'border-jb-600 bg-jb-600'
                      : 'border-iron-400 bg-white'
                  } ${active ? 'agent-live' : ''}`}
                >
                  <span
                    className={`h-[7px] w-[7px] rounded-full transition-colors ${
                      reported ? 'bg-white' : 'bg-iron-500'
                    }`}
                  />
                </span>
                <span
                  className={`text-[12px] leading-tight transition-colors ${
                    reported ? 'text-jb-900' : 'text-jb-300'
                  }`}
                >
                  {a.name}
                </span>
                <span
                  className={`tnum font-mono text-[10px] transition-opacity ${
                    reported && t ? 'text-jb-400 opacity-100' : 'opacity-0'
                  }`}
                >
                  {t ? `${t.ms}ms` : '—'}
                </span>
              </div>
            )
          })}

          {/* the gate */}
          <div className="relative flex w-[92px] shrink-0 flex-col items-end gap-2">
            <span
              className={`relative z-10 flex h-[27px] w-[27px] items-center justify-center rounded-full border transition-all duration-500 ${
                step > AGENTS.length
                  ? 'border-signal-gold bg-signal-gold'
                  : 'border-iron-400 bg-white'
              }`}
            >
              <Gavel
                size={13}
                strokeWidth={2}
                className={step > AGENTS.length ? 'text-white' : 'text-iron-500'}
              />
            </span>
            <span
              className={`text-[12px] leading-tight transition-colors ${
                step > AGENTS.length ? 'text-jb-900' : 'text-jb-300'
              }`}
            >
              The gate
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Conflict({ c, clientId }: { c: DeskConflict; clientId: string }) {
  const v = VERDICT[c.verdict.gate]
  const [openNote, setOpenNote] = useState(false)
  const [openList, setOpenList] = useState(false)

  return (
    <div className={`overflow-hidden rounded border ${v.border} bg-white`}>
      {/* verdict + what the RM actually does — the answer, first */}
      <div className={`flex flex-col gap-4 border-b ${v.border} ${v.bg} p-7`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-2">
            <Gavel size={14} className={v.text} strokeWidth={2} />
            <span className={`section-title ${v.text}`}>{v.label}</span>
          </span>
          <span className="text-[13px] text-jb-600">
            {c.overruled.length} finding{c.overruled.length === 1 ? '' : 's'} reshaped
          </span>
          {c.verdict.revisit && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-signal-good">
              <CalendarClock size={12} /> Revisit {c.verdict.revisit}
            </span>
          )}
        </div>

        {/* there is always an answer for the RM, even when it is "do nothing" */}
        <div>
          <div className="eyebrow-type text-jb-400">
            {c.action && c.verdict.gate !== 'authorised' ? v.lead : 'What you do'}
          </div>
          <p className="mt-1.5 max-w-[62ch] font-display text-[20px] font-light leading-snug text-jb-900">
            {c.action && c.verdict.gate !== 'authorised'
              ? c.action
              : c.verdict.gate === 'authorised'
                ? 'Nothing. This was instructed in writing and is not a breach.'
                : c.verdict.revisit
                  ? `Raise none of it this cycle. Back on the list in ${c.verdict.revisit}.`
                  : 'Raise none of it this cycle. Wait for them to reopen the subject.'}
          </p>
        </div>
      </div>

      {/* why */}
      <div className="flex flex-col gap-3 p-7">
        <div className="flex items-center gap-2">
          <Hand size={13} className="text-signal-gold" strokeWidth={2} />
          <span className="eyebrow-type text-signal-gold">
            Because · {KIND_LABEL[c.objection.kind]}
          </span>
        </div>
        <p className="max-w-[68ch] text-[15px] leading-relaxed text-jb-800">{c.objection.text}</p>

        {c.objection.evidence && (
          <div>
            <button
              onClick={() => setOpenNote((o) => !o)}
              className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-jb-400 transition-colors hover:text-jb-700"
            >
              <FileText size={11} />
              rm_notes.json · {c.objection.evidence.id} · {c.objection.evidence.date}
              <ChevronDown
                size={11}
                className={`transition-transform ${openNote ? 'rotate-180' : ''}`}
              />
            </button>
            {openNote && (
              <p className="mt-2 max-w-[72ch] border-l-2 border-signal-gold/40 pl-4 text-[13.5px] italic leading-relaxed text-jb-600">
                {c.objection.evidence.quote}
              </p>
            )}
          </div>
        )}
      </div>

      {/* what it overruled — compact, collapsed */}
      <div className="border-t border-iron-300">
        <button
          onClick={() => setOpenList((o) => !o)}
          className="flex w-full items-center gap-2 px-7 py-3.5 text-left transition-colors hover:bg-jb-50/60"
        >
          <ChevronDown
            size={13}
            className={`text-jb-400 transition-transform ${openList ? 'rotate-180' : ''}`}
          />
          <span className="eyebrow-type text-jb-400">
            What it overruled · {c.overruled.length}
          </span>
          {!openList && (
            <span className="truncate text-[12.5px] text-jb-400">
              {c.overruled.map((o) => o.agent).join(' · ')}
            </span>
          )}
        </button>

        {openList && (
          <div className="flex flex-col">
            {c.overruled.map((o) => (
              <div
                key={o.findingId}
                className="flex flex-col gap-1 border-t border-iron-300 px-7 py-3.5"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="rounded-sm bg-jb-50 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-jb-600">
                    {o.agent}
                  </span>
                  <span className="text-[13.5px] font-medium text-jb-900">{o.title}</span>
                </div>
                <p className="max-w-[74ch] text-[13px] leading-snug text-jb-600">{o.headline}</p>
                <div className="mt-0.5 flex flex-wrap gap-x-4 font-mono text-[10px] text-jb-300">
                  {o.evidence.map((e, i) => (
                    <span key={i}>
                      {e.source} · {e.ref}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-iron-300 bg-iron-100 px-7 py-3">
        <Link
          to={`/client/${clientId}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-jb-700 transition-colors hover:text-jb-900"
        >
          Open the brief <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}
