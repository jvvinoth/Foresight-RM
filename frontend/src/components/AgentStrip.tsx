import { Activity, Layers, ShieldCheck, Sparkles, TrendingDown, Users } from 'lucide-react'
import type { AgentId } from '../types'
import { AGENTS } from '../data/agents'

const ICON: Record<AgentId, typeof Activity> = {
  monitor: Activity,
  exposure: Layers,
  resilience: TrendingDown,
  opportunity: Sparkles,
  suitability: ShieldCheck,
  relationship: Users,
}

export interface AgentActivity {
  id: AgentId
  count: number
  state: 'idle' | 'running' | 'done'
}

export function AgentStrip({
  activity,
  active,
  onSelect,
  compact = false,
}: {
  activity: AgentActivity[]
  active?: AgentId | 'all'
  onSelect?: (id: AgentId | 'all') => void
  compact?: boolean
}) {
  const map = Object.fromEntries(activity.map((a) => [a.id, a]))

  return (
    <div className="thin-scroll flex items-stretch gap-px overflow-x-auto rounded border border-iron-400 bg-iron-400">
      {!compact && (
        <button
          onClick={() => onSelect?.('all')}
          className={`flex min-w-[108px] shrink-0 flex-col justify-center gap-1 px-4 py-3 text-left transition-colors ${
            active === 'all' ? 'bg-jb-900 text-white' : 'bg-white hover:bg-jb-50'
          }`}
        >
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] opacity-70">Agents</div>
          <div className="font-display text-[17px] leading-none">All six</div>
        </button>
      )}

      {AGENTS.map((a) => {
        const act = map[a.id] ?? { count: 0, state: 'idle' as const }
        const Icon = ICON[a.id]
        const isActive = active === a.id
        return (
          <button
            key={a.id}
            onClick={() => onSelect?.(a.id)}
            className={`group relative flex min-w-[142px] flex-1 shrink-0 flex-col gap-1.5 px-4 py-3 text-left transition-colors ${
              isActive ? 'bg-jb-900 text-white' : 'bg-white hover:bg-jb-50'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  isActive ? 'bg-white/15' : 'bg-jb-50'
                } ${act.state === 'running' ? 'agent-live' : ''}`}
              >
                <Icon size={13} className={isActive ? 'text-white' : 'text-jb-600'} strokeWidth={1.9} />
              </span>
              <span
                className={`tnum font-mono text-[11px] ${
                  act.count > 0
                    ? isActive
                      ? 'text-white'
                      : 'text-signal-critical'
                    : isActive
                      ? 'text-white/50'
                      : 'text-jb-300'
                }`}
              >
                {act.state === 'running' ? '···' : act.count > 0 ? act.count : '—'}
              </span>
            </div>
            <div className="flex flex-col">
              <span
                className={`font-mono text-[9px] uppercase tracking-[0.12em] ${
                  isActive ? 'text-white/60' : 'text-jb-400'
                }`}
              >
                {String(a.index).padStart(2, '0')}
                {a.isNew ? ' · new' : ''}
              </span>
              <span className="text-[13px] font-medium leading-tight">{a.name}</span>
            </div>
            {!compact && (
              <span
                className={`text-[10px] leading-tight ${isActive ? 'text-white/65' : 'text-jb-400'}`}
              >
                {a.kind === 'model' ? 'Model · narrates' : 'Deterministic'}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
