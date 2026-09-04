import { useState } from 'react'
import { CalendarClock, ChevronDown, FileText, Newspaper, StickyNote } from 'lucide-react'
import type { Finding } from '../types'
import { AGENT_MAP } from '../data/agents'
import { GateBadge, SeverityBar } from './ui'

const KIND_ICON = { file: FileText, note: StickyNote, event: Newspaper }

const TENSE_LABEL = { now: 'Now', next: 'Next', act: 'Act' } as const

export function FindingCard({ f, defaultOpen = false }: { f: Finding; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const agent = AGENT_MAP[f.agent]

  return (
    <div className="flex overflow-hidden rounded border border-iron-400 bg-white">
      <div className="w-[3px] shrink-0 py-3 pl-[3px]">
        <SeverityBar severity={f.severity} />
      </div>

      <div className="min-w-0 flex-1">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-jb-50/60"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-sm bg-jb-50 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-600">
                {String(agent.index).padStart(2, '0')} {agent.name}
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-300">
                {TENSE_LABEL[f.tense]}
              </span>
              <GateBadge gate={f.gate} />
            </div>

            <div className="mt-2 font-display text-[19px] leading-tight text-jb-900">{f.title}</div>
            <div className="mt-1.5 text-[13.5px] leading-snug text-jb-600">{f.headline}</div>
          </div>

          <ChevronDown
            size={16}
            className={`mt-1 shrink-0 text-jb-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {f.metrics && (
          <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-iron-300 px-5 py-3">
            {f.metrics.map((m) => (
              <div key={m.label}>
                <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-400">
                  {m.label}
                </div>
                <div
                  className={`tnum font-display text-[19px] leading-tight ${
                    m.alert ? 'text-signal-critical' : 'text-jb-900'
                  }`}
                >
                  {m.value}
                </div>
                {m.sub && <div className="text-[10.5px] text-jb-400">{m.sub}</div>}
              </div>
            ))}
          </div>
        )}

        {open && (
          <div className="overflow-hidden">
            <div className="border-t border-iron-300 px-5 py-4">
                <p className="max-w-[68ch] text-[13.5px] leading-relaxed text-jb-700">{f.body}</p>

                <div className="mt-4 rounded border border-iron-400 bg-iron-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <GateBadge gate={f.gate} />
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-400">
                      Gate decision
                    </span>
                  </div>
                  <div className="mt-2 text-[13px] leading-snug text-jb-800">{f.gateReason}</div>
                  {f.revisit && (
                    <div className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] text-signal-good">
                      <CalendarClock size={13} /> Revisit: {f.revisit}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-jb-400">
                    Evidence · {f.evidence.length} sources
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {f.evidence.map((e, i) => {
                      const Icon = KIND_ICON[e.kind]
                      return (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded border border-iron-300 bg-white px-3 py-2"
                        >
                          <Icon
                            size={13}
                            strokeWidth={1.9}
                            className={`mt-0.5 shrink-0 ${
                              e.kind === 'note' ? 'text-signal-gold' : 'text-jb-400'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="font-mono text-[11.5px] text-jb-800">
                              {e.source} <span className="text-jb-400">· {e.ref}</span>
                            </div>
                            <div className="text-[12px] leading-snug text-jb-500">{e.detail}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
