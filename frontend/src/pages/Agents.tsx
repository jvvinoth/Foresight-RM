import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  CalendarClock,
  FileText,
  Gavel,
  Hand,
  Layers,
  Play,
  ShieldCheck,
  Sparkles,
  StickyNote,
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

const VERDICT_STYLE: Record<
  DeskConflict['verdict']['gate'],
  { label: string; ring: string; bg: string; text: string }
> = {
  raise: {
    label: 'Raise now',
    ring: 'border-signal-critical/40',
    bg: 'bg-signal-critical/5',
    text: 'text-signal-critical',
  },
  reframe: {
    label: 'Reframe',
    ring: 'border-signal-warn/40',
    bg: 'bg-signal-warn/5',
    text: 'text-signal-warn',
  },
  hold: {
    label: 'Hold',
    ring: 'border-signal-good/40',
    bg: 'bg-signal-good/5',
    text: 'text-signal-good',
  },
  authorised: {
    label: 'Authorised',
    ring: 'border-jb-300',
    bg: 'bg-jb-50',
    text: 'text-jb-600',
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
  const [clientId, setClientId] = useState('')
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState(0)

  const desk = useDesk(clientId)

  useEffect(() => {
    if (!clientId && roster.data?.clients.length) setClientId(roster.data.clients[0].id)
  }, [roster.data, clientId])

  const run = () => {
    setRunning(true)
    setStep(0)
    AGENTS.forEach((_, i) =>
      setTimeout(() => {
        setStep(i + 1)
        if (i === AGENTS.length - 1) setRunning(false)
      }, 240 + i * 280),
    )
  }

  // re-run whenever a different client is put in front of the desk
  useEffect(() => {
    if (desk.data) run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desk.data?.client.id])

  const traceFor = (id: string) => desk.data?.trace.find((t) => t.agent === id)
  const settled = step >= AGENTS.length

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>The Desk</Eyebrow>
          <h1 className="page-title mt-2">
            Six specialists, one client
          </h1>
          <p className="lede-type mt-3 max-w-[70ch]">
            Each agent reviews the same client from its own discipline. Where two of them disagree, a
            rule decides — and the rule always lets the human fact win.
          </p>
        </div>
        <button
          onClick={run}
          disabled={running || !desk.data}
          className="inline-flex items-center gap-2 rounded bg-jb-900 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-jb-800 disabled:opacity-50"
        >
          <Play size={14} /> {running ? 'Running…' : 'Run the desk'}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <Eyebrow>
          Clients where an agent was overruled · {roster.data?.clients.length ?? '—'}
        </Eyebrow>
        <div className="thin-scroll flex gap-2 overflow-x-auto pb-1">
          {(roster.data?.clients ?? []).map((c) => {
            const v = VERDICT_STYLE[c.gate]
            const on = c.id === clientId
            return (
              <button
                key={c.id}
                onClick={() => setClientId(c.id)}
                className={`min-w-[188px] shrink-0 rounded border px-3.5 py-2.5 text-left transition-colors ${
                  on ? 'border-jb-900 bg-jb-900 text-white' : `${v.ring} bg-white hover:bg-jb-50`
                }`}
              >
                <div className="truncate text-[13px] font-medium leading-tight">{c.name}</div>
                <div
                  className={`mt-1 font-mono text-[9.5px] uppercase tracking-[0.1em] ${
                    on ? 'text-white/60' : v.text
                  }`}
                >
                  {v.label} · {c.conflicts} conflict{c.conflicts === 1 ? '' : 's'}
                </div>
              </button>
            )
          })}
        </div>
      </div>

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
            const t = traceFor(a.id)
            const found = desk.data?.findingsByAgent[a.id] ?? []
            const isChair = a.id === 'relationship'
            return (
              <div
                key={a.id}
                className={`flex flex-col gap-2.5 p-5 transition-colors duration-300 ${
                  reported ? (isChair ? 'bg-signal-gold/5' : 'bg-white') : 'bg-iron-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                        reported ? (isChair ? 'bg-signal-gold/15' : 'bg-jb-50') : 'bg-iron-300'
                      } ${step === i ? 'agent-live' : ''}`}
                    >
                      <Icon
                        size={14}
                        strokeWidth={1.9}
                        className={
                          reported ? (isChair ? 'text-signal-gold' : 'text-jb-600') : 'text-jb-300'
                        }
                      />
                    </span>
                    <div>
                      <div className="text-[14px] font-medium leading-tight text-jb-900">
                        {a.name}
                      </div>
                      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-jb-400">
                        {a.kind === 'model' ? 'model' : 'deterministic'}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`tnum font-mono text-[10.5px] ${
                      reported ? 'text-jb-400' : 'text-transparent'
                    }`}
                  >
                    {t ? `${t.ms}ms` : ''}
                  </span>
                </div>

                <p className="text-[12px] leading-snug text-jb-500">{ROLE[a.id]}</p>

                <div className="mt-auto border-t border-iron-300 pt-2.5">
                  {!reported ? (
                    <span className="font-mono text-[11px] text-jb-300">waiting…</span>
                  ) : isChair ? (
                    <span className="text-[12px] leading-snug text-jb-700">
                      {desk.data?.constraints.length
                        ? `${desk.data.constraints.length} constraint${
                            desk.data.constraints.length === 1 ? '' : 's'
                          } on file`
                        : 'No constraint on file'}
                    </span>
                  ) : found.length ? (
                    <span className="text-[12px] leading-snug text-jb-700">{found[0].title}</span>
                  ) : (
                    <span className="text-[12px] text-jb-300">Nothing above threshold</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {settled && desk.data && desk.data.conflicts.length > 0 && (
        <div className="flex flex-col gap-4">
          <div>
            <Eyebrow>Where they disagree · {desk.data.conflicts.length}</Eyebrow>
            <p className="mt-1 max-w-[74ch] text-[14px] text-jb-500">
              A detector states a finding on the evidence. Relationship objects on the evidence in
              the notes. Neither of them is wrong.
            </p>
          </div>
          {desk.data.conflicts.map((c) => (
            <Conflict key={c.findingId} c={c} clientId={desk.data!.client.id} />
          ))}
        </div>
      )}

      <div className="rounded border border-jb-200 bg-jb-50 p-8">
        <Eyebrow>The rule at this table</Eyebrow>
        <p className="mt-2 max-w-[70ch] font-display text-[19px] leading-relaxed text-jb-900">
          Relationship is the only agent that can veto another. A financial finding can be suppressed
          by a human fact — never the reverse.
        </p>
        <p className="mt-3 max-w-[74ch] text-[13px] leading-relaxed text-jb-600">
          That asymmetry keeps the Relationship Manager at the centre of the decision rather than
          downstream of it. Nothing here is scripted: every objection is extracted from a dated,
          attributed RM note, and every held finding stays on screen with a reason and a revisit date.
        </p>
      </div>
    </div>
  )
}

function Conflict({ c, clientId }: { c: DeskConflict; clientId: string }) {
  const v = VERDICT_STYLE[c.verdict.gate]
  return (
    <div className="overflow-hidden surface">
      <div className="grid @3xl:grid-cols-2">
        <div className="border-b border-iron-300 p-5 @3xl:border-b-0 @3xl:border-r">
          <div className="flex items-center gap-2">
            <ShieldCheck size={13} className="text-signal-critical" strokeWidth={2} />
            <span className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-signal-critical">
              {c.claim.agent} says · {c.claim.severity}
            </span>
          </div>
          <p className="mt-2.5 font-display text-[17px] leading-snug text-jb-900">
            &ldquo;{c.claim.headline}&rdquo;
          </p>
          <div className="mt-3 flex flex-col gap-1">
            {c.claim.evidence.map((e, i) => (
              <div key={i} className="flex items-start gap-2 font-mono text-[10.5px] text-jb-400">
                <FileText size={11} className="mt-0.5 shrink-0" />
                <span>
                  {e.source} · {e.ref}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-signal-gold/5 p-5">
          <div className="flex items-center gap-2">
            <Hand size={13} className="text-signal-gold" strokeWidth={2} />
            <span className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-signal-gold">
              Relationship objects · {KIND_LABEL[c.objection.kind]}
            </span>
          </div>
          <p className="mt-2.5 font-display text-[17px] leading-snug text-jb-900">
            &ldquo;{c.objection.text}&rdquo;
          </p>
          {c.objection.evidence && (
            <div className="mt-3 flex items-start gap-2">
              <StickyNote size={11} className="mt-0.5 shrink-0 text-signal-gold" />
              <div className="min-w-0">
                <div className="font-mono text-[10.5px] text-jb-500">
                  rm_notes.json · {c.objection.evidence.id} · {c.objection.evidence.date} ·{' '}
                  {c.objection.evidence.channel}
                </div>
                <p className="mt-1 text-[12px] italic leading-snug text-jb-600">
                  &ldquo;
                  {c.objection.evidence.quote.length > 200
                    ? `${c.objection.evidence.quote.slice(0, 200)}…`
                    : c.objection.evidence.quote}
                  &rdquo;
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-t p-5 ${v.ring} ${v.bg}`}>
        <span className="flex items-center gap-2">
          <Gavel size={14} className={v.text} strokeWidth={2} />
          <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${v.text}`}>
            The gate decides
          </span>
        </span>
        <span className={`font-display text-[20px] leading-none ${v.text}`}>{v.label}</span>
        <span className="text-[13px] text-jb-700">{c.verdict.meaning}</span>
        {c.verdict.revisit && (
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-signal-good">
            <CalendarClock size={12} /> Revisit {c.verdict.revisit}
          </span>
        )}
      </div>

      {c.action && c.verdict.gate !== 'authorised' && (
        <div className="flex flex-wrap items-start gap-2.5 border-t border-iron-300 bg-iron-100 px-5 py-3.5">
          <ArrowRight size={14} className="mt-0.5 shrink-0 text-jb-600" />
          <div className="min-w-[220px] flex-1">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-400">
              So the RM opens on
            </span>
            <p className="mt-0.5 text-[13.5px] leading-snug text-jb-800">{c.action}</p>
          </div>
          <Link
            to={`/client/${clientId}`}
            className="shrink-0 self-center rounded border border-iron-500 px-3 py-1.5 text-[12px] text-jb-700 transition-colors hover:bg-white"
          >
            Open the brief
          </Link>
        </div>
      )}
    </div>
  )
}
