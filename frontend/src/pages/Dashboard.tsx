import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Globe,
  Activity,
  TrendingDown,
  Landmark,
  Sparkles,
  Calendar,
  Gift,
  Copy,
  Check,
  X,
  Mic,
  Pause,
  Play,
  Square
} from 'lucide-react'
import { AgentStrip } from '../components/AgentStrip'
import { Eyebrow, GateBadge, usd } from '../components/ui'
import { AGENTS } from '../data/agents'
import { useBook } from '../api/client'
import { CLIENT_AVATARS, DEFAULT_AVATAR } from '../data/avatars'
import { Monogram } from '../components/Monogram'
import type { AgentId } from '../types'

const TONE: Record<string, string> = {
  critical: 'text-signal-critical',
  good: 'text-signal-good',
  gold: 'text-signal-gold',
}

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
        score: 98,
        gate: 'raise',
        reason: 'CRITICAL LTV: a 5% collateral fall pushes Lombard LTV to 73.06% against a 70.00% trigger. Margin call is active.'
      },
      'CL-0018': { // Elena Marchetti-Wong
        score: 91,
        gate: 'raise',
        reason: 'SAA BREACH: gold at USD 4,622.60/oz holds commodities at 14.04% of the portfolio against a 0-10% mandate band.'
      },
      'CL-0019': { // Abdullah Al-Mansoori
        score: 88,
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
        score: 100,
        gate: 'raise',
        reason: 'CRITICAL LTV: a 5% collateral fall raises Lombard LTV to 77.59%, breaching his 75.00% margin call trigger.'
      },
      'CL-0013': { // Zhang Meiling
        score: 86,
        gate: 'raise',
        reason: 'CONCENTRATION SQUEEZE: US tech single-name holdings crash against a USD 4,200,000 Lombard drawn line (CF-0003).'
      },
      'CL-0015': { // Kim Do-Yoon
        score: 82,
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
        score: 89,
        gate: 'raise',
        reason: 'LIQUIDITY SQUEEZE: Medical drawdowns of USD 1.28m require liquidating Treasuries (2045 maturity) at a -38% capital loss.'
      },
      'CL-0004': { // Chalermchai Suphanburi
        score: 85,
        gate: 'raise',
        reason: 'RETIREMENT PANIC: High yield curve crashes income-anchoring bonds. Hands over agribusiness with severe red marks.'
      },
      'CL-0003': { // Margarethe Voss-Brenner
        score: 79,
        gate: 'reframe',
        reason: 'CONSERVATIVE ALIGNMENT: rate shock hits the inherited equity, already 71.46% against a 10-30% band on a Conservative 2/10 profile.'
      }
    }
  }
}

// Tailored KYC Compliance Alerts from clients.csv for reviews due/overdue within 10 days of Sep 5, 2026
const KYC_ALERTS = [
  {
    id: 'CL-0011',
    name: 'Tan Boon Huat',
    status: 'overdue',
    dueDate: '31 Aug 2026',
    daysLabel: '5 Days Overdue',
    reason: 'Critical compliance breach. Estate duty & succession structures are unfinalised while KYC is overdue.'
  },
  {
    id: 'CL-0008',
    name: 'Chen Wei Ling',
    status: 'urgent',
    dueDate: '11 Sep 2026',
    daysLabel: 'Due in 6 Days',
    reason: 'Source of wealth update. Out-of-state tuition fees funding requires verified franchise cash flow statements.'
  }
]

// Cultural & Loyalty Engagement Calendar tailored specifically to our 20 clients' real metadata
const ENGAGEMENTS = [
  {
    date: 'Sep 25, 2026',
    type: 'cultural',
    title: 'Mid-Autumn Moon Festival',
    desc: 'Important cultural festival for Chinese and East Asian client families.',
    clients: [
      { id: 'CL-0013', name: 'Zhang Meiling', lang: 'Simplified Chinese', wish: '中秋快乐！愿明月带给您 and 您的家人和平与繁荣。' },
      { id: 'CL-0014', name: 'Lau Chi Ming', lang: 'Traditional Chinese', wish: '中秋快樂！祝願中秋佳節人月兩團圓，事業興旺。' },
      { id: 'CL-0011', name: 'Tan Boon Huat', lang: 'English', wish: 'Wishing you a peaceful Mid-Autumn festival. May the full moon bring health and unity to your family.' }
    ]
  },
  {
    date: 'Oct 02, 2026',
    type: 'birthday',
    title: 'Margarethe Voss-Brenner (Age 59)',
    desc: 'First birthday since transferring in. Client is conservative, grieving, and needs thoughtful, supportive outreach.',
    clients: [
      { id: 'CL-0003', name: 'Margarethe Voss-Brenner', lang: 'German', wish: 'Herzliche Grüße zum Geburtstag. Wir wünschen Ihnen ein gesundes und friedliches neues Lebensjahr.' }
    ]
  },
  {
    date: 'Oct 15, 2026',
    type: 'anniversary',
    title: 'Tan Boon Huat: 23 Years of Trust',
    desc: 'Major loyalty milestone. Client has been with Julius Baer since Feb 2003. Succession planning is highly urgent.',
    clients: [
      { id: 'CL-0011', name: 'Tan Boon Huat', lang: 'English', wish: 'Thank you for 23 years of invaluable partnership with Julius Baer. We remain committed to securing your family’s legacy across generations.' }
    ]
  },
  {
    date: 'Nov 08, 2026',
    type: 'cultural',
    title: 'Diwali Festival of Lights',
    desc: 'Auspicious festival of light and new beginnings for Indian client families.',
    clients: [
      { id: 'CL-0002', name: 'Ravi Chandrasekaran', lang: 'English', wish: 'Shubh Deepavali! May the festival of lights bring abundant health, prosperity, and light to your new venture and family trust.' },
      { id: 'CL-0010', name: 'Priya Nair Menon', lang: 'English', wish: 'Wishing you a luminous and happy Diwali. May the divine light bring growth, peace, and wisdom to your impact path.' }
    ]
  }
]

export default function Dashboard() {
  const [filter, setFilter] = useState<AgentId | 'all'>('all')
  const [scenario, setScenario] = useState<ScenarioId>('baseline')
  const [showSchedules, setShowSchedules] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  // Voice Briefing Recorder States
  const [activeRecordClient, setActiveRecordClient] = useState<{ id: string; name: string } | null>(null)
  const [consentGiven, setConsentGiven] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [recordingSaved, setRecordingSaved] = useState(false)

  const { data, isLoading, error } = useBook()

  // Recording Timer effect
  React.useEffect(() => {
    let interval: any = null
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [isRecording, isPaused])

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

  const handleCopyWish = (clientId: string, wishText: string) => {
    navigator.clipboard.writeText(wishText)
    setCopiedId(clientId)
    setTimeout(() => setCopiedId(null), 1800)
  }

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
    <div className="flex flex-col gap-6">
      {/* Header section with page titles and concierge toggle button */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{data?.rm.desk ?? 'Loading desk'}</Eyebrow>
          <h1 className="mt-2.5 font-display text-[34px] font-light leading-tight text-jb-900 tracking-[-0.015em]">
            Priority Radar
          </h1>
          <p className="mt-1.5 text-[13.5px] text-jb-500">
            {data?.rm.clients ?? 20} clients, ranked by what needs attention today — not by size.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSchedules(!showSchedules)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[12.5px] transition-all duration-300 font-sans font-medium relative cursor-pointer ${
              showSchedules
                ? 'bg-jb-900 text-white border-jb-900 shadow-sm'
                : 'bg-white text-jb-900 border-iron-300 hover:border-jb-400 hover:bg-jb-50/50'
            }`}
          >
            <Calendar className={showSchedules ? 'text-signal-gold animate-pulse' : 'text-jb-500'} size={14} />
            <span>Relationship Concierge</span>
            {!showSchedules && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-gold opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-signal-gold"></span>
              </span>
            )}
          </button>
          <div className="font-mono text-[11px] text-jb-400 hidden md:block">
            Snapshot · {data?.rm.asOf ?? '—'}
          </div>
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
                className={`flex flex-col text-left p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                  active
                    ? 'bg-jb-900 text-white border-jb-900 shadow-md scale-[1.01]'
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
          <span className="hidden md:inline text-signal-gold font-bold">★ Scenario re-ranking · figures from the dataset</span>
        </div>
      </div>

      {/* Stats KPI Ribbon with wide upstream Master dimensions */}
      <div className="thin-scroll flex gap-px overflow-x-auto rounded border border-iron-400 bg-iron-400">
        {(stats ?? Array.from({ length: 5 }, () => null)).map((s, i) => (
          <div key={s?.label ?? i} className="flex min-w-[196px] flex-1 shrink-0 flex-col gap-1.5 bg-white px-6 py-5">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-jb-400">
              {s?.label ?? '—'}
            </div>
            <div
              className={`tnum font-display text-[25px] font-normal leading-tight tracking-[0.02em] ${
                s?.tone ? TONE[s.tone] : 'text-jb-900'
              }`}
            >
              {s?.value ?? '·'}
            </div>
            <div className="text-[11px] leading-tight text-jb-400">{s?.sub ?? ''}</div>
          </div>
        ))}
      </div>

      {/* Core Dashboard Content (Full Width) */}
      <div className="flex flex-col gap-6 w-full min-w-0">
        {/* Top 3 High-Attention Relationship Cards */}
        {top3Clients.length > 0 && (
          <div className="flex flex-col gap-3 text-left">
            <div className="flex items-center gap-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-critical opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-signal-critical"></span>
              </div>
              <Eyebrow>Critical Relationships • Immediate Action Needed</Eyebrow>
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
                          <div
                            className={`absolute -bottom-1 -right-1 flex h-5 min-w-[24px] items-center justify-center rounded-full px-1 py-0.5 text-[9px] font-mono font-bold text-white shadow-md border border-white ${
                              isCritical ? 'bg-signal-critical' : 'bg-signal-warn'
                            }`}
                          >
                            {c.score.toFixed(1)}
                          </div>
                        </div>

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

                    {/* Floating Action/Status Icon & Briefing Recorder Trigger */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setActiveRecordClient({ id: c.id, name: c.name })
                          setConsentGiven(false)
                          setIsRecording(false)
                          setIsPaused(false)
                          setRecordSeconds(0)
                          setRecordingSaved(false)
                        }}
                        title="Record Meeting Brief"
                        className="p-1.5 rounded-full bg-white hover:bg-jb-50 border border-iron-300 shadow-3xs cursor-pointer text-jb-900 group/btn hover:scale-105 transition-all duration-200"
                      >
                        <Mic size={13} className="text-signal-gold group-hover/btn:text-jb-900 animate-pulse" />
                      </button>
                      <div className="text-jb-300 opacity-30 group-hover:opacity-100 group-hover:text-jb-600 transition-all duration-300">
                        {isCritical ? <ShieldAlert size={14} /> : <AlertTriangle size={14} />}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Agent Activity Stripe */}
        <div className="flex flex-col gap-2 text-left">
          <div className="flex items-baseline justify-between gap-4">
            <Eyebrow>Agent activity · this cycle</Eyebrow>
            <Link
              to="/agents"
              className="inline-flex items-center gap-1 text-[12px] text-jb-600 hover:text-jb-900 font-medium"
            >
              How the agents work <ArrowUpRight size={13} />
            </Link>
          </div>
          <AgentStrip activity={activity} active={filter} onSelect={setFilter} />
        </div>

        {/* Main Client Table */}
        <div className="overflow-hidden rounded border border-iron-400 bg-white">
          <div className="grid grid-cols-[36px_1fr_120px_128px_112px] items-center gap-4 border-b border-iron-400 bg-iron-100 px-5 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-400">
            <span>#</span>
            <span>Client & reason</span>
            <span className="text-right">AUM</span>
            <span className="text-right">Last contact</span>
            <span className="text-right">Gate</span>
          </div>

          {isLoading && (
            <div className="px-5 py-8 text-center text-[13px] text-jb-400">
              Running six agents across the book…
            </div>
          )}

          {clients.map((c) => {
            const avatar = CLIENT_AVATARS[c.id] || DEFAULT_AVATAR

            // Calculate dynamic KYC days alert badge (30-day window relative to Sept 5, 2026)
            const snapshotDate = new Date('2026-09-05')
            let kycTag = null
            if (c.kycDue) {
              const dueDate = new Date(c.kycDue)
              const diffTime = dueDate.getTime() - snapshotDate.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

              if (diffDays < 0) {
                kycTag = (
                  <span className="rounded bg-signal-critical/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-signal-critical font-bold shrink-0 border border-signal-critical/15 animate-pulse">
                    KYC Overdue ({Math.abs(diffDays)}d)
                  </span>
                )
              } else if (diffDays <= 30) {
                kycTag = (
                  <span className="rounded bg-signal-warn/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-signal-warn font-bold shrink-0 border border-signal-warn/15">
                    KYC Due ({diffDays}d)
                  </span>
                )
              }
            }

            return (
              <Link
                key={c.id}
                to={`/client/${c.id}`}
                className="grid grid-cols-[36px_1fr_120px_128px_112px] items-center gap-4 border-b border-iron-300 px-5 py-3.5 transition-colors last:border-b-0 hover:bg-jb-50 text-left"
              >
                <span className="tnum font-mono text-[12px] text-jb-300">
                  {String(c.rank).padStart(2, '0')}
                </span>

                <span className="flex items-center gap-3 min-w-0">
                  <img
                    src={avatar}
                    className="h-8 w-8 rounded-full border border-iron-200 object-cover shrink-0 shadow-3xs"
                    alt={c.name}
                  />
                  <span className="min-w-0 flex flex-col justify-center">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[14px] font-medium text-jb-900 truncate">{c.name}</span>
                      <span className="font-mono text-[10px] text-jb-300">{c.id}</span>
                      {c.language !== 'English' && (
                        <span className="rounded bg-jb-50 px-1.5 py-0.5 text-[10.5px] text-jb-600 font-sans shrink-0 border border-jb-100">
                          {c.language}
                        </span>
                      )}
                      {kycTag}
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-jb-500 max-w-full">
                      {c.reason}
                    </span>
                  </span>
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
            )
          })}
        </div>

        <p className="text-[11.5px] text-jb-400 text-left">
          Rank is materiality × urgency × severity, discounted by what the gate allows. A finding that
          cannot be raised today lowers a client&rsquo;s rank rather than disappearing from it.
        </p>
      </div>

      {/* Floating Sidebar Drawer Overlay (iOS/Android Navigation Drawer Style) */}
      {showSchedules && (
        <>
          {/* Dark blur backdrop that dismisses on click */}
          <div
            onClick={() => setShowSchedules(false)}
            className="fixed inset-0 bg-jb-950/20 backdrop-blur-[2px] z-40 cursor-pointer animate-backdrop-in"
          />

          {/* Sliding Drawer Container with Apple-native elastic slide transition */}
          <aside className="fixed top-0 right-0 h-full w-[360px] bg-iron-100 border-l border-jb-300/20 p-5 flex flex-col gap-4 z-50 shadow-2xl overflow-y-auto thin-scroll text-left animate-drawer-in">
            <div className="flex items-center justify-between border-b border-iron-300 pb-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-signal-gold font-bold font-mono">
                  <Gift size={13} />
                  <Eyebrow>Relationship Concierge</Eyebrow>
                </div>
                <h2 className="mt-1 text-[17px] font-bold text-jb-900 leading-snug">Personal Milestones</h2>
              </div>
              <button
                onClick={() => setShowSchedules(false)}
                className="text-jb-400 hover:text-jb-900 cursor-pointer p-1 rounded-full hover:bg-iron-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Critical Compliance Alerts (KYC reviews due/overdue) placed with top notch attention */}
            <div className="flex flex-col gap-3 border-b border-iron-300 pb-4">
              <div className="flex items-center gap-1.5 text-signal-critical font-bold font-mono text-[9px] uppercase tracking-wider">
                <ShieldAlert size={12} className="animate-pulse" />
                <span>Critical KYC Alerts</span>
              </div>
              
              <div className="flex flex-col gap-2.5">
                {KYC_ALERTS.map((alert) => {
                  const avatar = CLIENT_AVATARS[alert.id] || DEFAULT_AVATAR
                  const isOverdue = alert.status === 'overdue'
                  
                  return (
                    <div
                      key={alert.id}
                      className={`rounded-xl border p-3.5 flex flex-col gap-2 relative overflow-hidden bg-white shadow-3xs transition-colors hover:bg-jb-50/20 group ${
                        isOverdue
                          ? 'border-signal-critical/35 hover:border-signal-critical/60'
                          : 'border-signal-warn/35 hover:border-signal-warn/65'
                      }`}
                    >
                      {/* Left accent indicator ring ribbon */}
                      <div
                        className={`absolute top-0 bottom-0 left-0 w-1 ${
                          isOverdue ? 'bg-signal-critical' : 'bg-signal-warn'
                        }`}
                      />
                      
                      <div className="flex items-center justify-between gap-2 pl-1.5">
                        <Link to={`/client/${alert.id}`} className="flex items-center gap-2 group cursor-pointer min-w-0">
                          <img src={avatar} className="h-6 w-6 rounded-full object-cover shrink-0 border border-iron-200" alt={alert.name} />
                          <span className="text-[12.5px] font-bold text-jb-900 group-hover:text-jb-600 truncate">
                            {alert.name}
                          </span>
                        </Link>
                        <span
                          className={`text-[8.5px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border leading-none shrink-0 ${
                            isOverdue
                              ? 'text-signal-critical bg-signal-critical/5 border-signal-critical/15'
                              : 'text-signal-warn bg-signal-warn/5 border-signal-warn/15'
                          }`}
                        >
                          {alert.daysLabel}
                        </span>
                      </div>
                      
                      <p className="text-[11px] leading-snug text-jb-700 pl-1.5 font-sans">
                        {alert.reason}
                      </p>
                      <div className="flex items-center justify-between pl-1.5 mt-1 font-mono text-[9px] text-jb-400">
                        <span>Due Date: {alert.dueDate}</span>
                        <span className="underline group-hover:text-jb-600 transition-colors">Action Required →</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Personal and Cultural Milestones */}
            <div className="flex flex-col gap-4">
              {ENGAGEMENTS.map((ev, idx) => {
                let badgeClass = 'text-signal-gold bg-signal-gold/10 border-signal-gold/20'
                if (ev.type === 'birthday') badgeClass = 'text-signal-critical bg-signal-critical/5 border-signal-critical/15'
                if (ev.type === 'anniversary') badgeClass = 'text-jb-700 bg-jb-50 border-jb-200'

                return (
                  <div key={idx} className="rounded-xl border border-iron-300 bg-white p-4 shadow-2xs flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-jb-400 font-bold">{ev.date}</span>
                      <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded-full border ${badgeClass}`}>
                        {ev.type}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-[14.5px] font-bold text-jb-900 leading-tight">
                        {ev.title}
                      </h3>
                      <p className="mt-1 text-[11px] leading-tight text-jb-500">
                        {ev.desc}
                      </p>
                    </div>

                    <div className="border-t border-iron-100 pt-2.5 flex flex-col gap-3">
                      {ev.clients.map((c) => {
                        const avatar = CLIENT_AVATARS[c.id] || DEFAULT_AVATAR
                        const isCopied = copiedId === `${ev.title}-${c.id}`

                        return (
                          <div key={c.id} className="flex flex-col gap-1.5 p-2 rounded-lg bg-iron-100/50 hover:bg-iron-100 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <Link to={`/client/${c.id}`} className="flex items-center gap-2 group cursor-pointer min-w-0">
                                <img src={avatar} className="h-5 w-5 rounded-full object-cover shrink-0" alt={c.name} />
                                <span className="text-[12px] font-medium text-jb-900 group-hover:text-jb-600 truncate">
                                  {c.name}
                                </span>
                              </Link>
                              <button
                                onClick={() => handleCopyWish(`${ev.title}-${c.id}`, c.wish)}
                                className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-sm font-mono text-[9px] border transition-all cursor-pointer ${
                                  isCopied
                                    ? 'bg-signal-good/10 text-signal-good border-signal-good/20'
                                    : 'bg-white text-jb-500 border-iron-300 hover:border-jb-500'
                                }`}
                              >
                                {isCopied ? <Check size={8} /> : <Copy size={8} />}
                                <span>{isCopied ? 'Copied' : c.lang}</span>
                              </button>
                            </div>
                            <p className="font-sans text-[11px] text-jb-700 italic leading-snug pl-1 border-l-2 border-signal-gold/40">
                              &ldquo;{c.wish}&rdquo;
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>
        </>
      )}

      {/* Premium Voice Briefing Recorder Modal / Popup */}
      {activeRecordClient && (
        <>
          {/* Dark blur backdrop */}
          <div
            onClick={() => {
              if (!isRecording) {
                setActiveRecordClient(null)
              }
            }}
            className="fixed inset-0 bg-jb-950/45 backdrop-blur-sm z-50 animate-backdrop-in"
          />

          {/* Interactive Modal Cockpit */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-jb-300/30 p-6 w-full max-w-[420px] shadow-2xl flex flex-col gap-4 text-left relative animate-drawer-in">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-iron-200 pb-3">
                <div className="flex items-center gap-2 text-jb-900">
                  <Mic size={18} className="text-signal-gold animate-pulse" />
                  <h2 className="font-display text-[18px] font-bold tracking-tight">Briefing Recorder</h2>
                </div>
                {!isRecording && (
                  <button
                    onClick={() => setActiveRecordClient(null)}
                    className="text-jb-400 hover:text-jb-900 cursor-pointer p-1 rounded-full hover:bg-iron-100 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Step 1: Verbal Consent Screen */}
              {!consentGiven ? (
                <div className="flex flex-col gap-4 py-2">
                  <div className="p-3 bg-jb-50 rounded-xl border border-jb-100 flex flex-col gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-jb-500 font-bold">Client confidentiality disclosure</span>
                    <p className="text-[12px] leading-relaxed text-jb-700 font-sans">
                      Julius Baer compliance policies require explicit verbal client consent prior to recording any portfolio, SAA, or relationship briefing.
                    </p>
                    <div className="border-t border-iron-200 mt-1 pt-2 flex flex-col gap-1 text-[11px] font-mono text-jb-400">
                      <span>• Client: {activeRecordClient.name}</span>
                      <span>• Location: Singapore Booking Centre</span>
                    </div>
                  </div>

                  <p className="text-[12.5px] leading-relaxed text-jb-800 font-medium">
                    Do you have the client's verbal consent to record this briefing?
                  </p>

                  <div className="flex flex-col gap-2.5 mt-2 w-full">
                    <button
                      onClick={() => {
                        setConsentGiven(true)
                        setIsRecording(true)
                        setIsPaused(false)
                        setRecordSeconds(0)
                        setRecordingSaved(false)
                      }}
                      className="w-full py-3 rounded-full bg-signal-good text-white hover:bg-jb-900 transition-all text-[13px] font-semibold font-sans cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Check size={14} className="shrink-0" />
                      <span>Verbal Consent Confirmed</span>
                    </button>
                    <button
                      onClick={() => setActiveRecordClient(null)}
                      className="w-full py-2.5 rounded-full border border-iron-300 hover:border-jb-400 hover:bg-jb-50/20 text-[12.5px] text-jb-500 hover:text-jb-900 transition-all font-sans cursor-pointer text-center"
                    >
                      No, Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Live Recording Cockpit Screen */
                <div className="flex flex-col gap-5 py-2">
                  
                  {/* Active Recording State Visual */}
                  {!recordingSaved ? (
                    <div className="flex flex-col items-center justify-center py-6 bg-iron-100/50 rounded-2xl border border-iron-200 gap-4">
                      
                      {/* Equalizer Soundwave Animation */}
                      <div className="flex items-end justify-center gap-1.5 h-12 w-full">
                        <div className={`w-1.5 rounded-full bg-signal-gold ${isRecording && !isPaused ? 'animate-wave-1' : 'h-2'}`} style={{ transformOrigin: 'bottom' }} />
                        <div className={`w-1.5 rounded-full bg-jb-900 ${isRecording && !isPaused ? 'animate-wave-2' : 'h-3'}`} style={{ transformOrigin: 'bottom' }} />
                        <div className={`w-1.5 rounded-full bg-signal-gold ${isRecording && !isPaused ? 'animate-wave-3' : 'h-4'}`} style={{ transformOrigin: 'bottom' }} />
                        <div className={`w-1.5 rounded-full bg-jb-900 ${isRecording && !isPaused ? 'animate-wave-4' : 'h-3'}`} style={{ transformOrigin: 'bottom' }} />
                        <div className={`w-1.5 rounded-full bg-signal-gold ${isRecording && !isPaused ? 'animate-wave-5' : 'h-2'}`} style={{ transformOrigin: 'bottom' }} />
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-[22px] font-bold text-jb-900 leading-none tracking-wider">
                          {Math.floor(recordSeconds / 60).toString().padStart(2, '0')}:{(recordSeconds % 60).toString().padStart(2, '0')}
                        </span>
                        <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${isPaused ? 'text-signal-warn' : 'text-signal-critical animate-pulse'}`}>
                          {isPaused ? 'Recording Paused' : 'Live Voice Capture...'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Step 3: Success state */
                    <div className="flex flex-col items-center text-center py-6 bg-signal-good/5 rounded-2xl border border-signal-good/20 gap-3">
                      <div className="h-10 w-10 rounded-full bg-signal-good/10 text-signal-good flex items-center justify-center">
                        <Check size={20} />
                      </div>
                      <div className="flex flex-col gap-1 px-4 text-center">
                        <h3 className="text-[14.5px] font-bold text-jb-900">Briefing Saved Successfully</h3>
                        <p className="text-[12px] leading-relaxed text-jb-500 font-sans">
                          Meeting brief for **{activeRecordClient.name}** has been securely recorded and cached locally. Analytical agents are queued to digest.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Cockpit Actions */}
                  {!recordingSaved ? (
                    <div className="flex items-center gap-3">
                      {/* Pause / Resume Button */}
                      <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`flex-1 py-2.5 rounded-full border text-[12.5px] font-medium font-sans flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          isPaused
                            ? 'bg-white text-jb-900 border-iron-300 hover:border-jb-500'
                            : 'bg-white text-signal-warn border-signal-warn/25 hover:bg-signal-warn/5'
                        }`}
                      >
                        {isPaused ? <Play size={13} /> : <Pause size={13} />}
                        <span>{isPaused ? 'Resume Record' : 'Pause Record'}</span>
                      </button>

                      {/* Stop and Save Button */}
                      <button
                        onClick={() => {
                          setIsRecording(false)
                          setRecordingSaved(true)
                        }}
                        className="flex-1 py-2.5 rounded-full bg-signal-critical text-white hover:bg-jb-900 text-[12.5px] font-semibold font-sans flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                      >
                        <Square size={12} fill="white" />
                        <span>Stop & Save Brief</span>
                      </button>
                    </div>
                  ) : (
                    /* Close out action */
                    <button
                      onClick={() => setActiveRecordClient(null)}
                      className="w-full py-2.5 rounded-full bg-jb-900 text-white hover:bg-jb-800 text-[12.5px] font-bold font-sans cursor-pointer text-center transition-all shadow-xs"
                    >
                      Done & return to Cockpit
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
