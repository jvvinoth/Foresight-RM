import { useEffect, useState } from 'react'
import type { Outlook as OutlookData } from '../api/client'
import { Eyebrow } from './ui'

export function Outlook({ data }: { data: OutlookData }) {
  const [grown, setGrown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGrown(true), 40)
    return () => clearTimeout(t)
  }, [])

  if (!data.facility || !data.shocks.length) {
    return (
      <div className="rounded border border-iron-400 bg-white p-8 text-center text-[13px] text-jb-500">
        This client has no credit facility, so there is no collateral shock to model.
      </div>
    )
  }

  const trigger = data.trigger ?? 0
  const max = Math.max(...data.shocks.map((s) => s.ltv), trigger) * 1.06
  const headroom = trigger - (data.ltv ?? 0)

  return (
    <div className="rounded border border-iron-400 bg-white p-5">
      <Eyebrow>Resilience agent · what could happen next</Eyebrow>
      <div className="mt-1 font-display text-[19px] text-jb-900">
        Loan-to-value under a collateral shock
      </div>
      <p className="mt-1.5 max-w-[64ch] text-[13px] leading-snug text-jb-600">
        Lending value is market value after per-asset advance-rate haircuts. Where the collateral is
        also the concentration, selling it to raise cash raises the ratio rather than lowering it.
      </p>

      <div className="mt-5 flex flex-col gap-2.5">
        {data.shocks.map((s, i) => (
          <div key={s.shock} className="flex items-center gap-4">
            <div className="w-16 shrink-0 font-mono text-[12px] text-jb-600">{s.shock}</div>
            <div className="relative h-7 flex-1 overflow-hidden rounded bg-iron-200">
              <div
                className={`h-full transition-[width] duration-700 ease-out ${
                  s.breach ? 'bg-signal-critical' : 'bg-jb-600'
                }`}
                style={{
                  width: grown ? `${(s.ltv / max) * 100}%` : '0%',
                  transitionDelay: `${i * 90}ms`,
                }}
              />
              <div
                className="absolute inset-y-0 border-l-2 border-dashed border-jb-900"
                style={{ left: `${(trigger / max) * 100}%` }}
              />
            </div>
            <div
              className={`tnum w-[68px] shrink-0 text-right font-mono text-[13px] ${
                s.breach ? 'text-signal-critical' : 'text-jb-800'
              }`}
            >
              {s.ltv.toFixed(2)}%
            </div>
            <div className="w-[104px] shrink-0 text-right font-mono text-[10px] uppercase tracking-[0.1em]">
              {s.breach ? (
                <span className="text-signal-critical">margin call</span>
              ) : (
                <span className="text-jb-300">within</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-iron-300 pt-3 font-mono text-[11px] text-jb-500">
        <span className="inline-block h-3 border-l-2 border-dashed border-jb-900" />
        <span>
          Trigger {trigger.toFixed(2)}% · today {(data.ltv ?? 0).toFixed(2)}% · headroom{' '}
          {headroom.toFixed(2)} points
        </span>
        <span className="text-jb-300">credit_facilities.csv · {data.facility}</span>
      </div>

      {data.path && data.path.length > 0 && (
        <div className="mt-5 border-t border-iron-300 pt-4">
          <Eyebrow>The path so far</Eyebrow>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
              <thead>
                <tr className="text-left font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-400">
                  <th className="py-1.5 pr-4 font-medium">Snapshot</th>
                  <th className="py-1.5 pr-4 text-right font-medium">LTV</th>
                  <th className="py-1.5 pr-4 text-right font-medium">Drawn</th>
                  <th className="py-1.5 pr-4 text-right font-medium">Collateral</th>
                  <th className="py-1.5 font-medium" />
                </tr>
              </thead>
              <tbody className="tnum font-mono">
                {data.path.map((p) => (
                  <tr key={p.date} className="border-t border-iron-300">
                    <td className="py-1.5 pr-4 text-jb-600">{p.date}</td>
                    <td
                      className={`py-1.5 pr-4 text-right ${
                        p.breach ? 'text-signal-critical' : 'text-jb-800'
                      }`}
                    >
                      {p.ltv.toFixed(2)}%
                    </td>
                    <td className="py-1.5 pr-4 text-right text-jb-600">
                      {p.drawn.toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-jb-600">
                      {p.collateral.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-[10px] uppercase tracking-[0.1em] text-signal-critical">
                      {p.breach ? 'breach' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
