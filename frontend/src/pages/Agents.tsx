import { Link } from 'react-router-dom'
import { ArrowRight, Cpu, Sparkles } from 'lucide-react'
import { Eyebrow } from '../components/ui'
import { AGENTS } from '../data/agents'
import { useBook } from '../api/client'

const VERBS = [
  { verb: 'continuously monitors portfolios', owners: ['monitor'] },
  { verb: 'identifies risks and opportunities', owners: ['exposure', 'resilience', 'opportunity'] },
  { verb: 'generates personalised recommendations', owners: ['suitability', 'relationship'] },
  { verb: 'supports better RM-client conversations', owners: [] },
]

export default function Agents() {
  const { data } = useBook()
  const counts: Record<string, number> = {}
  const examples: Record<string, { id: string; name: string; reason: string }[]> = {}
  for (const c of data?.clients ?? []) {
    for (const a of c.agents) {
      counts[a] = (counts[a] ?? 0) + 1
      ;(examples[a] ??= []).push({ id: c.id, name: c.name, reason: c.reason })
    }
  }
  return (
    <div className="flex flex-col gap-7">
      <div>
        <Eyebrow>Architecture</Eyebrow>
        <h1 className="mt-1 font-display text-[30px] leading-tight text-jb-900">
          Six agents, one gate
        </h1>
        <p className="mt-2 max-w-[70ch] text-[13.5px] leading-relaxed text-jb-500">
          Each agent reads raw data and produces findings. The Gate applies rules over relationship
          facts; the Narrator writes sentences. Neither discovers anything, so neither is an agent.
        </p>
      </div>

      {/* verb coverage */}
      <div className="overflow-hidden rounded border border-iron-400 bg-white">
        <div className="border-b border-iron-400 bg-iron-100 px-5 py-2.5">
          <Eyebrow>Coverage against the challenge brief</Eyebrow>
        </div>
        {VERBS.map((v) => (
          <div
            key={v.verb}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-iron-300 px-5 py-3 last:border-b-0"
          >
            <span className="min-w-[280px] flex-1 font-display text-[14.5px] italic text-jb-800">
              “{v.verb}”
            </span>
            <span className="flex flex-wrap gap-1.5">
              {v.owners.length ? (
                v.owners.map((o) => {
                  const a = AGENTS.find((x) => x.id === o)!
                  return (
                    <span
                      key={o}
                      className="rounded-sm bg-jb-50 px-2 py-1 font-mono text-[10.5px] text-jb-700"
                    >
                      {String(a.index).padStart(2, '0')} {a.name}
                    </span>
                  )
                })
              ) : (
                <span className="rounded-sm bg-iron-200 px-2 py-1 font-mono text-[10.5px] text-jb-600">
                  Gate → Narrator → RM
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* agent cards */}
      <div className="grid gap-px overflow-hidden rounded border border-iron-400 bg-iron-400 md:grid-cols-2 xl:grid-cols-3">
        {AGENTS.map((a) => {
          const n = counts[a.id] ?? 0
          const ex = (examples[a.id] ?? []).slice(0, 3)
          return (
            <div key={a.id} className="flex flex-col gap-3 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-400">
                    {String(a.index).padStart(2, '0')}
                    {a.isNew && <span className="ml-2 text-signal-gold">new</span>}
                  </div>
                  <div className="mt-0.5 font-display text-[20px] leading-tight text-jb-900">
                    {a.name}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] ${
                    a.kind === 'model'
                      ? 'bg-signal-gold/10 text-signal-gold'
                      : 'bg-jb-50 text-jb-600'
                  }`}
                >
                  {a.kind === 'model' ? <Sparkles size={11} /> : <Cpu size={11} />}
                  {a.kind === 'model' ? 'Model' : 'Code'}
                </span>
              </div>

              <p className="font-display text-[14px] italic leading-snug text-jb-700">
                “{a.question}”
              </p>
              <p className="text-[12.5px] leading-snug text-jb-500">{a.role}</p>

              <div className="mt-auto border-t border-iron-300 pt-3">
                <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-400">
                  Clients flagged this cycle · {n}
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {ex.map((c) => (
                    <Link
                      key={c.id}
                      to={`/client/${c.id}`}
                      className="group flex items-center justify-between gap-2 text-[12px] text-jb-700 hover:text-jb-900"
                    >
                      <span className="min-w-0 truncate">
                        <span className="text-jb-400">{c.name.split(' ')[0]} · </span>
                        {c.reason}
                      </span>
                      <ArrowRight
                        size={12}
                        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </Link>
                  ))}
                  {n === 0 && (
                    <span className="text-[12px] text-jb-300">No findings above threshold.</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* the rule */}
      <div className="rounded border border-jb-300 bg-jb-50 p-6">
        <Eyebrow>The rule that makes this bank-safe</Eyebrow>
        <p className="mt-2 max-w-[72ch] font-display text-[17px] leading-relaxed text-jb-900">
          The model never originates a number. Every figure is computed in code, every market event
          resolves against the approved event log, and every finding carries its file, its row and —
          where relevant — a dated, attributed RM note.
        </p>
        <p className="mt-3 max-w-[72ch] text-[13px] leading-relaxed text-jb-600">
          Relationship is the only agent that can veto another agent&rsquo;s output. A financial
          finding can be suppressed by a human fact; never the reverse. That asymmetry is what keeps
          the Relationship Manager at the centre of the decision rather than downstream of it.
        </p>
      </div>
    </div>
  )
}
