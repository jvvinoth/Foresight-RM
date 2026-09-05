import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Clock, AlertTriangle, ShieldAlert, Globe, Activity, TrendingDown, Landmark, Sparkles } from 'lucide-react'
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

import { CLIENT_AVATARS, DEFAULT_AVATAR } from '../data/avatars'

type ScenarioId = 'baseline' | 'hormuz' | 'tech' | 'rates'

const SCENARIOS: Record<
  ScenarioId,
  {
    name: string
    desc: string
    impact: string
    icon: React.ComponentType<{ size?: number | string; className?: string }>
    overrides?: Record<string, { score: number; gate: 'raise' | 'reframe' | 'hold'; reason: string }>
  }
> = {
  baseline: {
    name: 'Baseline Mode',
    desc: 'Normal conditions as of Aug 2026. No active geopolitical escalation.',
    impact: 'RM Priority list sorted by normal portfolio risk, suitability, and client kyc reviews.',
    icon: Activity,
  },
  hormuz: {
    name: 'Hormuz Blockade',
    desc: 'Middle East offensive expands. Strait of Hormuz closed, oil spikes past $140/bbl.',
    impact: 'Severe commodity and regional SAA breaches. Collateral value drops for property holdings.',
    icon: Globe,
    overrides: {
      'CL-0014': { // Lau Chi Ming
        score: 9.8,
        gate: 'raise',
        reason: 'CRITICAL LTV: Geopolitical collateral crash pushes Lombard LTV to 73.4% (Limit: 70.0%). Margin call is active.'
      },
      'CL-0018': { // Elena Marchetti-Wong
        score: 9.1,
        gate: 'raise',
        reason: 'SAA BREACH: Gold surge to USD 5,200/oz inflates commodity allocation to 48.6% of portfolio against 10% ceiling.'
      },
      'CL-0019': { // Abdullah Al-Mansoori
        score: 8.8,
        gate: 'raise',
        reason: 'CORRELATION RISK: Shipping and energy FCN locks in identical risk exposure with his primary Gulf operating cargo group.'
      }
    }
  },
  tech: {
    name: 'AI Capex Crash',
    desc: 'US technology leaders shed 35%. Growth and technology portfolios experience extreme correction.',
    impact: 'Triggers critical leverage margin calls on tech-heavy portfolios and ELN structures.',
    icon: TrendingDown,
    overrides: {
      'CL-0002': { // Ravi Chandrasekaran
        score: 10.0,
        gate: 'raise',
        reason: 'CRITICAL LTV: US technology dropdown raises Lombard LTV to 79.8%, breaching his 75.0% margin call limit.'
      },
      'CL-0013': { // Zhang Meiling
        score: 8.6,
        gate: 'raise',
        reason: 'CONCENTRATION SQUEEZE: Core US Tech single stock holdings crash. High leverage risk across USD 4.2m Lombard drawn line.'
      },
      'CL-0015': { // Kim Do-Yoon
        score: 8.2,
        gate: 'raise',
        reason: 'FCN BARRIER BREACH: Tech FCN structured notes drop past knockout thresholds, triggering forced stock delivery.'
      }
    }
  },
  rates: {
    name: 'Yield Curve Shock',
    desc: 'Fed target pushes yields +100bps. Fixed income duration shock drops long bonds by -15%.',
    impact: 'Triggers critical income preservation alarms on conservative and retirement portfolios.',
    icon: Landmark,
    overrides: {
      'CL-0012': { // Cheung Kwok Wing
        score: 8.9,
        gate: 'raise',
        reason: 'LIQUIDITY SQUEEZE: Medical drawdowns of USD 1.28m require liquidating Treasuries (2045 maturity) at a -38% capital loss.'
      },
      'CL-0004': { // Chalermchai Suphanburi
        score: 8.5,
        gate: 'raise',
        reason: 'RETIREMENT PANIC: High yield curve crashes income-anchoring bonds. Hands over agribusiness with severe red marks.'
      },
      'CL-0003': { // Margarethe Voss-Brenner
        score: 7.9,
        gate: 'reframe',
        reason: 'CONSERVATIVE ALIGNMENT: Grieving widow is conservative, but inherited long-bonds fell -15% in capital value.'
      }
    }
  }
}

export default function Dashboard() {
  const [filter, setFilter] = useState<AgentId | 'all'>('all')
  const [scenario, setScenario] = useState<ScenarioId>('baseline')
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
    const rows = (data?.clients ?? []).map((c) => {
      const overrides = SCENARIOS[scenario].overrides
      if (overrides && overrides[c.id]) {
        return { ...c, ...overrides[c.id] }
      }
      return c
    })

    // Re-sort and rank clients dynamically based on chosen scenario
    const sorted = [...rows].sort((a, b) => b.score - a.score)
    const ranked = sorted.map((c, idx) => ({ ...c, rank: idx + 1 }))

    return filter === 'all' ? ranked : ranked.filter((c) => c.agents.includes(filter))
  }, [data, filter, scenario])

  const top3Clients = useMemo(() => {
    const rows = (data?.clients ?? []).map((c) => {
      const overrides = SCENARIOS[scenario].overrides
      if (overrides && overrides[c.id]) {
        return { ...c, ...overrides[c.id] }
      }
      return c
    })
    return [...rows].sort((a, b) => b.score - a.score).slice(0, 3)
  }, [data, scenario])

  const stats = useMemo(() => {
    if (!data?.stats) return []
    const newStats = [...data.stats]
    if (scenario === 'hormuz') {
      newStats[2] = { label: 'Raise now', value: '7', sub: 'Conflict triggers breaches', tone: 'critical' }
      newStats[3] = { label: 'Held', value: '11', sub: 'Revisiting after risk review', tone: 'good' }
    } else if (scenario === 'tech') {
      newStats[2] = { label: 'Raise now', value: '6', sub: 'Tech margin calls triggered', tone: 'critical' }
      newStats[3] = { label: 'Held', value: '12', sub: 'Deferred due to market panic', tone: 'good' }
    } else if (scenario === 'rates') {
      newStats[2] = { label: 'Raise now', value: '5', sub: 'Long bonds under pressure', tone: 'critical' }
      newStats[3] = { label: 'Held', value: '13', sub: 'Sovereign duration review', tone: 'good' }
    }
    return newStats
  }, [data?.stats, scenario])

  if (error) {
    return (
      <div className="rounded border border-signal-critical/30 bg-signal-critical/5 p-6 text-[13.5px] text-jb-800">
        Could not reach the API. Start it with{' '}
        <code className="font-mono text-[13px]">
          cd backend &amp;&amp; uvicorn main:app --port 8010
        </code>
        .
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{data?.rm.desk ?? 'Loading desk'}</Eyebrow>
          <h1 className="page-title mt-2">Priority Radar</h1>
          <p className="lede-type mt-2">
            {data?.rm.clients ?? 20} clients, ranked by what needs attention today — not by size.
          </p>
        </div>
        <div className="font-mono text-[11px] text-jb-400">
          Snapshot · {data?.rm.asOf ?? '—'}
        </div>
      </div>

      {/* Interactive Scenario Stress Simulator */}
      <div className="rounded-2xl border border-jb-300/40 bg-white/70 p-5 shadow-xs backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-signal-gold animate-pulse" size={14} />
          <Eyebrow>Interactive Foresight Stress Simulator</Eyebrow>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.keys(SCENARIOS) as ScenarioId[]).map((sid) => {
            const sc = SCENARIOS[sid]
            const Icon = sc.icon
            const active = scenario === sid

            return (
              <button
                key={sid}
                onClick={() => setScenario(sid)}
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-300 ${
                  active
                    ? 'border-jb-900 bg-jb-900 text-white shadow-md'
                    : 'border-iron-300 bg-white hover:border-jb-300 hover:bg-jb-50/40 text-jb-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={16} className={active ? 'text-signal-gold' : 'text-jb-500'} />
                  <span className="font-bold text-[13.5px] font-sans leading-none">{sc.name}</span>
                </div>
                <p className={`mt-1.5 text-[11px] leading-tight line-clamp-2 ${active ? 'text-jb-100/90' : 'text-jb-500'}`}>
                  {sc.desc}
                </p>
              </button>
            )
          })}
        </div>
        <div className="mt-3.5 pt-3 border-t border-iron-200 flex items-center justify-between text-[11.5px] text-jb-500 font-mono">
          <span>Active Simulation Impact: <span className="text-jb-800 font-bold font-sans">{SCENARIOS[scenario].impact}</span></span>
          <span className="hidden md:inline text-signal-gold font-bold">★ Pure Deterministic Stress re-ranking</span>
        </div>
      </div>

      <div className="thin-scroll flex gap-px overflow-x-auto rounded border border-iron-400 bg-iron-400">
        {(stats ?? Array.from({ length: 5 }, () => null)).map((s, i) => (
          <div key={s?.label ?? i} className="flex min-w-[196px] flex-1 shrink-0 flex-col gap-1.5 bg-white px-6 py-5">
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

      {/* Top 3 High-Attention Relationship Cards */}
      {top3Clients.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-critical opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-signal-critical"></span>
            </div>
            <Eyebrow>Critical Relationships · Immediate Action Needed</Eyebrow>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {top3Clients.map((c) => {
              const avatarUrl = CLIENT_AVATARS[c.id] || DEFAULT_AVATAR
              const isCritical = c.score >= 7.5 || c.gate === 'raise'

              return (
                <Link
                  key={c.id}
                  to={`/client/${c.id}`}
                  className={`group flex flex-col justify-between rounded-2xl bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md cursor-pointer relative overflow-hidden border border-t-[6px] ${
                    isCritical
                      ? 'border-signal-critical'
                      : 'border-signal-warn'
                  }`}
                >
                  {/* Subtle corner glow */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-24 opacity-3 group-hover:opacity-6 transition-opacity pointer-events-none rounded-full blur-2xl ${
                      isCritical ? 'bg-signal-critical' : 'bg-signal-warn'
                    }`}
                  />

                  <div className="flex flex-col gap-3">
                    {/* Top Section: Avatar (Left-aligned) + Details (Right-aligned) */}
                    <div className="flex items-center gap-4 text-left w-full">
                      {/* Avatar on the left */}
                      <div className="relative shrink-0">
                        <div
                          className={`relative h-14 w-14 rounded-full overflow-hidden p-0.5 bg-white transition-transform duration-500 group-hover:scale-105 border-2 ${
                            isCritical ? 'border-signal-critical' : 'border-signal-warn'
                          }`}
                        >
                          <img
                            src={avatarUrl}
                            alt={c.name}
                            className="h-full w-full rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                c.name
                              )}`
                            }}
                          />
                        </div>
                        {/* Floating Priority Score Badge with white outline */}
                        <div
                          className={`absolute -bottom-1 -right-1 flex h-5 min-w-[24px] items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-mono font-bold text-white shadow-md border border-white ${
                            isCritical ? 'bg-signal-critical' : 'bg-signal-warn'
                        }`}
                        >
                          {c.score.toFixed(1)}
                        </div>
                      </div>

                      {/* Details on the right of avatar */}
                      <div className="flex flex-col text-left min-w-0">
                        <h3 className="truncate text-[18px] font-bold text-jb-900 group-hover:text-jb-600 transition-colors leading-tight">
                          {c.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-jb-400 font-mono text-[10px]">
                          <span>{c.id}</span>
                          <span>·</span>
                          <span
                            className={`text-[8.5px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-semibold border ${
                              c.wealthBand === 'UHNW'
                                ? 'bg-signal-gold/5 text-signal-gold border-signal-gold/15'
                                : 'bg-jb-50 text-jb-500 border-jb-200'
                            }`}
                          >
                            {c.wealthBand}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Left-aligned Italicized Reason Quote with Smart Quotes */}
                    <div className="mt-2 text-left w-full min-h-[44px] flex items-center">
                      <p className="text-[13px] leading-relaxed text-jb-700 font-sans italic line-clamp-2">
                        &ldquo;{c.reason}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Thin horizontal spacing line */}
                  <div className="my-5 w-full border-t border-iron-200 group-hover:border-iron-300 transition-colors" />

                  {/* Left and Right Aligned Footer Section */}
                  <div className="flex items-end justify-between w-full">
                    <div className="flex flex-col text-left">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-jb-400">AUM</span>
                      <span className="font-mono text-[14px] font-bold text-jb-900 leading-none mt-1.5">
                        {usd(c.aumUsd)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end text-right">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-jb-400 mb-1">GATE</span>
                      <GateBadge gate={c.gate} />
                    </div>
                  </div>

                  {/* Floating Action/Status Icon */}
                  <div className="absolute top-3 right-3 text-jb-300 opacity-20 group-hover:opacity-100 group-hover:text-jb-600 transition-all duration-300">
                    {isCritical ? <ShieldAlert size={14} /> : <AlertTriangle size={14} />}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

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

      <div className="overflow-hidden surface">
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
              <span className="mt-0.5 block truncate text-[13px] text-jb-500">{c.reason}</span>
            </span>

            <span className="tnum text-right font-mono text-[13px] text-jb-700">
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
