import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Clock } from 'lucide-react'
import { AgentStrip } from '../components/AgentStrip'
import { Eyebrow, GateBadge, usd } from '../components/ui'
import { AGENTS } from '../data/agents'
import { useBook } from '../api/client'
import type { AgentId } from '../types'

const TONE: Record<string, string> = {
  critical: 'text-signal-critical',
  good: 'text-signal-good',
  gold: 'text-signal-gold',
}

export default function Dashboard() {
  const [filter, setFilter] = useState<AgentId | 'all'>('all')
  const { data, isLoading, error } = useBook()

  const activity = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of data?.clients ?? []) for (const a of c.agents) counts[a] = (counts[a] ?? 0) + 1
    return AGENTS.map((a) => ({
      id: a.id,
      count: counts[a.id] ?? 0,
      state: (isLoading ? 'running' : 'done') as 'running' | 'done',
    }))
  }, [data, isLoading])

  const clients = useMemo(() => {
    const rows = data?.clients ?? []
    return filter === 'all' ? rows : rows.filter((c) => c.agents.includes(filter))
  }, [data, filter])

  if (error) {
    return (
      <div className="rounded border border-signal-critical/30 bg-signal-critical/5 p-6 text-[13.5px] text-jb-800">
        Could not reach the API. Start it with{' '}
        <code className="font-mono text-[12.5px]">
          cd backend &amp;&amp; uvicorn main:app --port 8010
        </code>
        .
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{data?.rm.desk ?? 'Loading desk'}</Eyebrow>
          <h1 className="mt-1 font-display text-[30px] leading-tight text-jb-900">Priority Radar</h1>
          <p className="mt-1 text-[13.5px] text-jb-500">
            {data?.rm.clients ?? 20} clients, ranked by what needs attention today — not by size.
          </p>
        </div>
        <div className="font-mono text-[11px] text-jb-400">
          Snapshot · {data?.rm.asOf ?? '—'}
        </div>
      </div>

      <div className="thin-scroll flex gap-px overflow-x-auto rounded border border-iron-400 bg-iron-400">
        {(data?.stats ?? Array.from({ length: 5 }, () => null)).map((s, i) => (
          <div key={s?.label ?? i} className="flex min-w-[150px] flex-1 shrink-0 flex-col gap-1 bg-white px-5 py-4">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-400">
              {s?.label ?? '—'}
            </div>
            <div
              className={`tnum font-display text-[26px] leading-none ${
                s?.tone ? TONE[s.tone] : 'text-jb-900'
              }`}
            >
              {s?.value ?? '·'}
            </div>
            <div className="text-[11px] leading-tight text-jb-400">{s?.sub ?? ''}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <Eyebrow>Agent activity · this cycle</Eyebrow>
          <Link
            to="/agents"
            className="inline-flex items-center gap-1 text-[12px] text-jb-600 hover:text-jb-900"
          >
            How the agents work <ArrowUpRight size={13} />
          </Link>
        </div>
        <AgentStrip activity={activity} active={filter} onSelect={setFilter} />
      </div>

      <div className="overflow-hidden rounded border border-iron-400 bg-white">
        <div className="grid grid-cols-[36px_1fr_120px_128px_112px] items-center gap-4 border-b border-iron-400 bg-iron-100 px-5 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-400">
          <span>#</span>
          <span>Client and reason</span>
          <span className="text-right">AUM</span>
          <span className="text-right">Last contact</span>
          <span className="text-right">Gate</span>
        </div>

        {isLoading && (
          <div className="px-5 py-8 text-center text-[13px] text-jb-400">
            Running six agents across the book…
          </div>
        )}

        {clients.map((c) => (
          <Link
            key={c.id}
            to={`/client/${c.id}`}
            className="grid grid-cols-[36px_1fr_120px_128px_112px] items-center gap-4 border-b border-iron-300 px-5 py-3.5 transition-colors last:border-b-0 hover:bg-jb-50"
          >
            <span className="tnum font-mono text-[12px] text-jb-300">
              {String(c.rank).padStart(2, '0')}
            </span>

            <span className="min-w-0">
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="text-[14.5px] font-medium text-jb-900">{c.name}</span>
                <span className="font-mono text-[10px] text-jb-300">{c.id}</span>
                {c.language !== 'English' && (
                  <span className="rounded-sm bg-jb-50 px-1.5 py-px text-[10.5px] text-jb-600">
                    {c.language}
                  </span>
                )}
                {c.kycOverdue && (
                  <span className="rounded-sm bg-signal-warn/10 px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.08em] text-signal-warn">
                    KYC due
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-[12.5px] text-jb-500">{c.reason}</span>
            </span>

            <span className="tnum text-right font-mono text-[12.5px] text-jb-700">
              {usd(c.aumUsd)}
            </span>

            <span
              className={`tnum flex items-center justify-end gap-1.5 text-right font-mono text-[12px] ${
                (c.lastContactDays ?? 0) > 150 ? 'text-signal-warn' : 'text-jb-400'
              }`}
            >
              {(c.lastContactDays ?? 0) > 150 && <Clock size={12} />}
              {c.lastContactDays ?? '—'}d
            </span>

            <span className="flex justify-end">
              <GateBadge gate={c.gate} />
            </span>
          </Link>
        ))}
      </div>

      <p className="text-[11.5px] text-jb-400">
        Rank is materiality × urgency × severity, discounted by what the gate allows. A finding that
        cannot be raised today lowers a client&rsquo;s rank rather than disappearing from it.
      </p>
    </div>
  )
}
