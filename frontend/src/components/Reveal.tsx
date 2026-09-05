import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Link2, RotateCcw } from 'lucide-react'
import type { Reveal as RevealData } from '../api/client'
import { Eyebrow } from './ui'

/** Counts up, but always lands on the target even if rAF is throttled. */
function useCountUp(target: number, run: boolean, ms = 850) {
  const [v, setV] = useState(0)
  const raf = useRef(0)
  const snap = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!run) {
      setV(0)
      return
    }
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms)
      setV(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    snap.current = setTimeout(() => {
      cancelAnimationFrame(raf.current)
      setV(target)
    }, ms + 250)
    return () => {
      cancelAnimationFrame(raf.current)
      clearTimeout(snap.current)
    }
  }, [target, run, ms])

  return v
}

function useMounted(active: boolean) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!active) {
      setOn(false)
      return
    }
    const t = setTimeout(() => setOn(true), 40)
    return () => clearTimeout(t)
  }, [active])
  return on
}

export function Reveal({ data }: { data: RevealData }) {
  const [revealed, setRevealed] = useState(false)
  const grown = useMounted(revealed)
  const shown = useCountUp(data.corePct, revealed)

  const total = data.rows.reduce((s, r) => s + r.pct, 0) || 1
  const merged = [...data.rows].sort((a, b) =>
    a.kind === b.kind ? b.pct - a.pct : a.kind === 'core' ? -1 : 1,
  )
  const maxRow = Math.max(...data.rows.map((r) => r.pct), 1)
  const wrapped = data.rows.find((r) => r.wrapper)

  return (
    <div className="overflow-hidden rounded border border-iron-400 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-iron-400 bg-iron-100 px-5 py-3">
        <div>
          <Eyebrow>Exposure agent · look-through</Eyebrow>
          <div className="mt-0.5 font-display text-[17px] text-jb-900">
            {revealed ? 'What they are actually exposed to' : 'What the bank shows today'}
          </div>
        </div>
        <button
          onClick={() => setRevealed((r) => !r)}
          className={`inline-flex items-center gap-2 rounded px-4 py-2 text-[13px] font-medium transition-colors ${
            revealed
              ? 'border border-iron-500 bg-white text-jb-700 hover:bg-iron-100'
              : 'bg-jb-900 text-white hover:bg-jb-800'
          }`}
        >
          {revealed ? (
            <>
              <RotateCcw size={14} /> Show as the bank sees it
            </>
          ) : (
            <>
              <Link2 size={14} /> Reveal correlated exposure
            </>
          )}
        </button>
      </div>

      <div className="p-5">
        {!revealed ? (
          <div className="flex flex-col gap-2">
            {data.rows.map((r) => (
              <div key={r.label} className="flex items-center gap-4">
                <div className="w-[42%] shrink-0 truncate text-[13px] text-jb-700" title={r.label}>
                  {r.label}
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-iron-300">
                  <div
                    className="h-full rounded-full bg-jb-400"
                    style={{ width: `${(r.pct / maxRow) * 100}%` }}
                  />
                </div>
                <div className="tnum w-14 shrink-0 text-right font-mono text-[12px] text-jb-700">
                  {r.pct.toFixed(2)}%
                </div>
                <div className="w-[110px] shrink-0 text-right font-mono text-[10px] uppercase tracking-[0.1em] text-signal-good">
                  within limit
                </div>
              </div>
            ))}
            <div className="mt-3 border-t border-iron-300 pt-3 text-[12px] text-jb-400">
              {data.rows.length} positions, {data.rows.length} asset lines. Nothing exceeds its own
              limit, so nothing is flagged.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="tnum font-display text-[46px] leading-none text-signal-critical">
                    {shown.toFixed(1)}%
                  </div>
                  <div className="mt-1 text-[13px] text-jb-600">
                    of total wealth in {data.label}
                  </div>
                </div>
                <div className="text-right">
                  <div className="tnum font-display text-[26px] leading-none text-jb-700">
                    {data.allPct.toFixed(1)}%
                  </div>
                  <div className="mt-1 text-[11px] text-jb-400">including adjacent exposure</div>
                </div>
              </div>

              <div className="mt-4 flex h-9 w-full overflow-hidden rounded bg-iron-200">
                {merged.map((r, i) => (
                  <div
                    key={r.label}
                    title={`${r.label} — ${r.pct}%`}
                    className={`h-full border-r border-white/60 transition-[width] duration-700 ease-out last:border-r-0 ${
                      r.kind === 'core' ? 'bg-signal-critical' : 'bg-jb-400'
                    }`}
                    style={{
                      width: grown ? `${(r.pct / total) * 100}%` : '0%',
                      transitionDelay: `${i * 70}ms`,
                    }}
                  />
                ))}
              </div>

              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-jb-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-signal-critical" /> Same sector and region
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-jb-400" /> Adjacent — same region family
                </span>
              </div>
            </div>

            {wrapped && (
              <div className="rounded border border-signal-critical/25 bg-signal-critical/5 px-4 py-3">
                <Eyebrow>Hidden by the wrapper</Eyebrow>
                <div className="mt-1 text-[13px] leading-snug text-jb-800">{wrapped.wrapper}</div>
                <div className="mt-1.5 font-mono text-[10.5px] text-jb-400">
                  instruments.csv · underlying_reference
                </div>
              </div>
            )}

            {data.outside.length > 0 && (
              <div>
                <Eyebrow>And outside the portfolio entirely</Eyebrow>
                <div className="mt-2 grid gap-2 @2xl:grid-cols-3">
                  {data.outside.map((o, i) => (
                    <div
                      key={o.label}
                      className="rounded border border-signal-gold/35 bg-signal-gold/5 px-4 py-3 transition-all duration-500 ease-out"
                      style={{
                        opacity: grown ? 1 : 0,
                        transform: grown ? 'translateX(0)' : 'translateX(20px)',
                        transitionDelay: `${500 + i * 130}ms`,
                      }}
                    >
                      <div className="text-[13px] font-semibold text-jb-900">{o.label}</div>
                      <div className="mt-1 text-[11.5px] leading-snug text-jb-600">{o.detail}</div>
                      <div className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-jb-400">
                        {o.system}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-iron-300 pt-4 text-[13px] text-jb-700">
              <ArrowRight size={15} className="shrink-0 text-signal-critical" />
              <span>
                Their portfolio, their loan and their livelihood are one position. No single system
                in the bank sees all of it at once.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
