import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Ban, Check, Clock, Languages, Pencil, Quote, Send, Sparkles } from 'lucide-react'
import { AgentStrip } from '../components/AgentStrip'
import { FindingCard } from '../components/FindingCard'
import { Outlook } from '../components/Outlook'
import { Reveal } from '../components/Reveal'
import { Eyebrow, GateBadge, usd } from '../components/ui'
import { AGENTS } from '../data/agents'
import { CLIENT_AVATARS, DEFAULT_AVATAR } from '../data/avatars'
import { Monogram } from '../components/Monogram'
import {
  approve,
  generateDraft,
  useBrief,
  useClient,
  useFindings,
  useHandover,
  useOutlook,
  useReveal,
  type Handover as HandoverData,
} from '../api/client'

type Tab = 'findings' | 'reveal' | 'outlook' | 'brief' | 'handover'

const TABS: { id: Tab; label: string; note: string }[] = [
  { id: 'findings', label: 'All findings', note: 'Every agent' },
  { id: 'reveal', label: 'Exposure', note: 'Look-through' },
  { id: 'outlook', label: 'Outlook', note: 'What could happen next' },
  { id: 'brief', label: 'Conversation brief', note: 'What to say' },
  { id: 'handover', label: 'Handover', note: 'Continuity' },
]

export default function Client() {
  const { id = '' } = useParams()
  const [tab, setTab] = useState<Tab>('findings')

  const client = useClient(id)
  const findings = useFindings(id)
  const reveal = useReveal(id, tab === 'reveal')
  const outlook = useOutlook(id, tab === 'outlook')
  const handover = useHandover(id, tab === 'handover')

  const rel = client.data?.relationship
  const list = findings.data?.findings ?? []
  const trace = findings.data?.trace ?? []

  const activity = AGENTS.map((a) => ({
    id: a.id,
    count: list.filter((f) => f.agent === a.id).length,
    state: (findings.isLoading ? 'running' : 'done') as 'running' | 'done',
  }))

  if (client.error) {
    return (
      <div className="surface p-10 text-center">
        <p className="text-jb-600">Client not found.</p>
        <Link to="/dashboard" className="mt-3 inline-block text-jb-700 underline">
          Back to Priority Radar
        </Link>
      </div>
    )
  }

  const toRaise = list.filter((f) => f.gate === 'raise' || f.gate === 'reframe')
  const held = list.filter((f) => f.gate === 'hold' || f.gate === 'authorised')

  return (
    <div className="flex flex-col gap-8">
      <Link
        to="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 text-[13px] text-jb-500 hover:text-jb-900"
      >
        <ArrowLeft size={14} /> Priority Radar
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-iron-400 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Unified Client Portrait Avatar */}
            <div className="relative shrink-0">
              <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-jb-300 bg-white p-0.5 shadow-sm">
                <img
                  src={CLIENT_AVATARS[id] || DEFAULT_AVATAR}
                  alt={client.data?.name ?? 'Client'}
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="font-display text-[32px] font-light leading-none text-jb-900 tracking-[-0.015em]">
                {client.data?.name ?? '…'}
              </h1>
              <span className="font-mono text-[11px] text-jb-300">{id}</span>
              {client.data && <GateBadge gate={client.data.gate} size="md" />}
            </div>
          </div>
          <p className="mt-3 max-w-[66ch] text-[13.5px] text-jb-500">{rel?.objectives}</p>
        </div>
        <div className="flex gap-7">
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-400">AUM</div>
            <div className="tnum font-display text-[21px] leading-tight text-jb-900">
              {client.data ? usd(client.data.aumUsd) : '—'}
            </div>
          </div>
          <div>
            <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-400">
              Relationship
            </div>
            <div className="tnum font-display text-[21px] leading-tight text-jb-900">
              {rel?.tenure_years ?? '—'} yrs
            </div>
          </div>
        </div>
      </div>

      <AgentStrip activity={activity} compact />

      {trace.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-jb-300">
          {trace.map((t) => (
            <span key={t.agent}>
              {t.agent} {t.ms}ms · {t.found} found · {t.kind}
            </span>
          ))}
        </div>
      )}

      <div className="grid gap-5 @4xl:grid-cols-[280px_1fr]">
        <aside className="flex flex-col gap-4 @4xl:sticky @4xl:top-[68px] @4xl:self-start">
          <div className="surface p-6">
            <Eyebrow>The person</Eyebrow>
            <dl className="mt-3 flex flex-col gap-2.5 text-[13px]">
              {rel &&
                (
                  [
                    ['Client since', `${rel.since.slice(0, 4)} · ${rel.tenure_years} years`],
                    ['Life stage', rel.life_stage],
                    ['Source of wealth', rel.source_of_wealth],
                    ['Risk profile', `${rel.risk_profile} · ${rel.risk_score}/10`],
                    ['Booking centre', rel.booking_centre],
                    [
                      'Residence / tax',
                      `${rel.residence} / ${rel.tax_domicile}${rel.cross_border ? ' ⚠' : ''}`,
                    ],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <dt className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-jb-400">
                      {k}
                    </dt>
                    <dd className="text-jb-800">{v}</dd>
                  </div>
                ))}
            </dl>

            {rel && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-iron-300 pt-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-jb-50 px-2.5 py-1 text-[11.5px] text-jb-700">
                  <Languages size={12} /> {rel.language}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] ${
                    (rel.last_contact_days ?? 0) > 150
                      ? 'bg-signal-warn/10 text-signal-warn'
                      : 'bg-iron-200 text-jb-600'
                  }`}
                >
                  <Clock size={12} /> {rel.last_contact_days ?? '—'}d since contact
                </span>
                {rel.kyc_overdue && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-signal-warn/10 px-2.5 py-1 text-[11.5px] text-signal-warn">
                    KYC due {rel.kyc_due}
                  </span>
                )}
              </div>
            )}
          </div>

          {rel && rel.said.length > 0 && (
            <div className="rounded border border-signal-gold/35 bg-signal-gold/5 p-4">
              <Eyebrow>What they told you</Eyebrow>
              <div className="mt-3 flex flex-col gap-3">
                {rel.said.slice(0, 2).map((s) => (
                  <div key={s.id}>
                    <Quote size={13} className="text-signal-gold" />
                    <p className="mt-1 font-display text-[13px] italic leading-snug text-jb-800">
                      {s.quote.length > 250 ? `${s.quote.slice(0, 250)}…` : s.quote}
                    </p>
                    <p className="mt-1.5 font-mono text-[10px] text-jb-400">
                      {s.id} · {s.date} · {s.channel}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="surface p-6">
            <Eyebrow>Constraints</Eyebrow>
            {rel && rel.constraints.length === 0 ? (
              <p className="mt-2 flex items-start gap-2 text-[13px] text-signal-good">
                <Check size={14} className="mt-0.5 shrink-0" />
                None on file. Nothing blocks this conversation today.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {rel?.constraints.map((c) => (
                  <li key={c.text} className="flex items-start gap-2 text-[13px] text-jb-700">
                    <Ban
                      size={13}
                      className={`mt-0.5 shrink-0 ${
                        c.blocking ? 'text-signal-critical' : 'text-signal-warn'
                      }`}
                    />
                    <span>
                      {c.text}
                      {c.revisit && (
                        <span className="ml-1 font-mono text-[10.5px] text-signal-good">
                          · revisit {c.revisit}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {client.data && (
              <div className="mt-3 border-t border-iron-300 pt-3">
                <div className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-jb-400">
                  Gate verdict
                </div>
                <div className="mt-1.5">
                  <GateBadge gate={client.data.gate} size="md" />
                </div>
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap gap-px overflow-hidden rounded border border-iron-400 bg-iron-400">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 px-4 py-2.5 text-left transition-colors ${
                  tab === t.id ? 'bg-jb-900 text-white' : 'bg-white text-jb-700 hover:bg-jb-50'
                }`}
              >
                <div className="text-[13px] font-medium leading-tight">{t.label}</div>
                <div
                  className={`font-mono text-[9.5px] uppercase tracking-[0.1em] ${
                    tab === t.id ? 'text-white/55' : 'text-jb-400'
                  }`}
                >
                  {t.note}
                </div>
              </button>
            ))}
          </div>

          <div>
            {tab === 'findings' && (
              <div className="flex flex-col gap-8">
                {findings.isLoading && (
                  <div className="surface px-5 py-8 text-center text-[13px] text-jb-400">
                    Running agents…
                  </div>
                )}
                {toRaise.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <Eyebrow>To raise · {toRaise.length}</Eyebrow>
                    {toRaise.map((f, i) => (
                      <FindingCard key={f.id} f={f} defaultOpen={i === 0} />
                    ))}
                  </div>
                )}
                {held.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <Eyebrow>Held or authorised · {held.length}</Eyebrow>
                    <p className="-mt-1 text-[12px] text-jb-400">
                      Shown, never hidden. Each carries a reason and, where relevant, a revisit date.
                    </p>
                    {held.map((f) => (
                      <FindingCard key={f.id} f={f} />
                    ))}
                  </div>
                )}
                {!findings.isLoading && list.length === 0 && (
                  <div className="surface px-5 py-8 text-center text-[14px] text-jb-500">
                    Monitored. Nothing above threshold this cycle.
                  </div>
                )}
              </div>
            )}

            {tab === 'reveal' &&
              (reveal.data && reveal.data.rows.length ? (
                <Reveal data={reveal.data} />
              ) : (
                <div className="surface p-8 text-center text-[14px] text-jb-500">
                  {reveal.isLoading
                    ? 'Resolving look-through…'
                    : 'No correlated cluster above threshold for this client.'}
                </div>
              ))}

            {tab === 'outlook' &&
              (outlook.data ? (
                <Outlook data={outlook.data} />
              ) : (
                <div className="surface p-8 text-center text-[14px] text-jb-500">
                  Loading…
                </div>
              ))}

            {tab === 'brief' && <Brief id={id} />}
            {tab === 'handover' && handover.data && <Handover data={handover.data} />}
          </div>
        </section>
      </div>
    </div>
  )
}

function Brief({ id }: { id: string }) {
  const { data, isLoading } = useBrief(id, true)
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [approved, setApproved] = useState<{ ts: string; edited: boolean } | null>(null)

  if (isLoading || !data) {
    return (
      <div className="surface p-8 text-center text-[13px] text-jb-400">
        Writing the brief…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="surface p-7">
        <Eyebrow>Narrator · pre-meeting brief</Eyebrow>
        <div className="section-title mt-1.5">Conversation brief</div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="rounded border border-signal-critical/25 bg-signal-critical/5 px-4 py-3">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-signal-critical">
              Open with
            </div>
            <p className="mt-1.5 font-display text-[15px] leading-snug text-jb-900">
              {data.open_with}
            </p>
          </div>

          {data.do_not_lead_with && (
            <div className="rounded border border-signal-warn/25 bg-signal-warn/5 px-4 py-3">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-signal-warn">
                Do not lead with
              </div>
              <p className="mt-1.5 text-[13.5px] leading-snug text-jb-800">
                {data.do_not_lead_with}
              </p>
            </div>
          )}

          <div className="rounded border border-iron-400 bg-iron-100 px-4 py-3">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-400">
              The one number to have ready
            </div>
            <p className="tnum mt-1.5 font-display text-[19px] text-jb-900">{data.one_number}</p>
          </div>
        </div>
      </div>

      <div className="surface p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Eyebrow>Client-facing draft · {data.language}</Eyebrow>
            <div className="mt-0.5 text-[13px] text-jb-500">
              Generated in the client&rsquo;s reporting language. A draft until the RM approves it.
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setBusy(true)
                try {
                  setDraft(await generateDraft(id))
                } finally {
                  setBusy(false)
                }
              }}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded border border-iron-500 px-3 py-1.5 text-[13px] text-jb-700 hover:bg-iron-100 disabled:opacity-60"
            >
              <Sparkles size={13} /> {busy ? 'Generating…' : draft ? 'Regenerate' : 'Generate'}
            </button>
            <button
              disabled={!draft}
              onClick={async () => {
                if (!draft) return
                setApproved(
                  await approve(id, {
                    action: 'approve',
                    ai_draft: draft.body,
                    final_text: draft.body,
                    finding_ids: data.raise.map((f) => f.id),
                  }),
                )
              }}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] font-medium text-white transition-colors disabled:opacity-40 ${
                approved ? 'bg-signal-good' : 'bg-jb-900 hover:bg-jb-800'
              }`}
            >
              {approved ? <Check size={13} /> : <Send size={13} />}
              {approved ? 'Approved · logged' : 'Approve'}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded border border-iron-400 bg-iron-100 px-4 py-4">
          {draft ? (
            <>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-jb-400">
                {draft.subject}
              </div>
              <div className="mt-2 whitespace-pre-wrap font-display text-[14px] leading-relaxed text-jb-800">
                {draft.body}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-[14px] text-jb-500">
              <Pencil size={13} /> Press Generate to draft this in {data.language}.
            </div>
          )}
        </div>

        {approved && (
          <div className="mt-3 flex items-center gap-2 font-mono text-[11px] text-signal-good">
            <Check size={13} /> Approval persisted {approved.ts} with the RM id, the original draft
            and the final text.
          </div>
        )}
      </div>
    </div>
  )
}

function Handover({ data }: { data: HandoverData }) {
  const rows: [string, string][] = [
    ['Speak to them in', data.language],
    ['Relationship age', `${data.tenureYears} years · client since ${data.since.slice(0, 4)}`],
    ['How the money was made', data.sourceOfWealth],
    ['What they want', data.objectives],
    ['What they believe', data.beliefs[0] ?? '—'],
    ['Do not do', data.doNot.length ? data.doNot.join('; ') : 'No standing restrictions'],
    ['Open actions', data.openActions.length ? data.openActions.join('; ') : 'None'],
    [
      'Cross-border',
      data.crossBorder ? `Resident ${data.residence}, taxed ${data.taxDomicile}` : 'No',
    ],
    ['KYC review', `${data.kycDue}${data.kycOverdue ? ' — overdue' : ''}`],
  ]

  return (
    <div className="surface p-7">
      <Eyebrow>Relationship agent · continuity pack</Eyebrow>
      <div className="section-title mt-1.5">
        If the RM leaves tomorrow, this does not leave with her
      </div>
      <p className="mt-1.5 max-w-[64ch] text-[14px] text-jb-500">
        Everything a new Relationship Manager needs on day one, without reading years of files.
      </p>

      <div className="mt-5 grid gap-4 @3xl:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="border-l-2 border-jb-200 pl-3">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-400">{k}</div>
            <div className="mt-1 text-[13px] leading-snug text-jb-800">{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
