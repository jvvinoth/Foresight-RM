import type { ReactNode } from 'react'
import type { Gate, Severity } from '../types'

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-jb-500">{children}</div>
  )
}

export function Panel({
  children,
  className = '',
  pad = true,
}: {
  children: ReactNode
  className?: string
  pad?: boolean
}) {
  return (
    <div
      className={`rounded border border-iron-400 bg-white ${pad ? 'p-5' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

const GATE_STYLE: Record<Gate, { label: string; cls: string; dot: string }> = {
  raise: {
    label: 'Raise now',
    cls: 'text-signal-critical border-signal-critical/30 bg-signal-critical/5',
    dot: 'bg-signal-critical',
  },
  reframe: {
    label: 'Reframe',
    cls: 'text-signal-warn border-signal-warn/30 bg-signal-warn/5',
    dot: 'bg-signal-warn',
  },
  hold: {
    label: 'Hold',
    cls: 'text-signal-good border-signal-good/30 bg-signal-good/5',
    dot: 'bg-signal-good',
  },
  authorised: {
    label: 'Authorised',
    cls: 'text-jb-500 border-jb-300 bg-jb-50',
    dot: 'bg-jb-400',
  },
}

export function GateBadge({ gate, size = 'sm' }: { gate: Gate; size?: 'sm' | 'md' }) {
  const s = GATE_STYLE[gate]
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border font-mono uppercase tracking-[0.1em] ${s.cls} ${
        size === 'md' ? 'px-3 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

const SEV: Record<Severity, string> = {
  critical: 'bg-signal-critical',
  high: 'bg-signal-warn',
  medium: 'bg-jb-400',
  info: 'bg-iron-500',
}

export function SeverityBar({ severity }: { severity: Severity }) {
  return <span className={`block h-full w-[3px] rounded-full ${SEV[severity]}`} />
}

export function Stat({
  label,
  value,
  sub,
  alert,
}: {
  label: string
  value: string
  sub?: string
  alert?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-jb-400">{label}</div>
      <div
        className={`tnum font-display text-[22px] leading-none ${
          alert ? 'text-signal-critical' : 'text-jb-900'
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] leading-tight text-jb-500">{sub}</div>}
    </div>
  )
}

export function usd(n: number) {
  if (n >= 1_000_000) return `USD ${(n / 1_000_000).toFixed(1)}m`
  return `USD ${n.toLocaleString()}`
}
