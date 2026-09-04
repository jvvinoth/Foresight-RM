import { AlertTriangle, Check } from 'lucide-react'
import { Eyebrow } from '../components/ui'
import { useIntegrity } from '../api/client'

export default function Integrity() {
  const { data, isLoading } = useIntegrity()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Governance</Eyebrow>
        <h1 className="mt-1 font-display text-[30px] leading-tight text-jb-900">Data integrity</h1>
        <p className="mt-2 max-w-[74ch] text-[13.5px] leading-relaxed text-jb-500">
          The dataset contains deliberate artefacts of the kind found in production banking data. A
          system that handles them silently is indistinguishable from one that fell into them. These
          are the ones we found, what a naive read produces, what we report instead, and where in the
          code it is handled.
        </p>
      </div>

      <div className="overflow-x-auto rounded border border-iron-400 bg-white">
        <table className="w-full min-w-[900px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-iron-100 text-left font-mono text-[9.5px] uppercase tracking-[0.12em] text-jb-400">
              <th className="border-b border-iron-400 px-5 py-3 font-medium">Artefact</th>
              <th className="border-b border-iron-400 px-5 py-3 font-medium">Naive result</th>
              <th className="border-b border-iron-400 px-5 py-3 font-medium">What we report</th>
              <th className="border-b border-iron-400 px-5 py-3 font-medium">Why, and where</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-jb-400">
                  Loading…
                </td>
              </tr>
            )}
            {(data?.traps ?? []).map((t) => (
              <tr key={t.trap} className="align-top">
                <td className="border-b border-iron-300 px-5 py-3.5 font-medium text-jb-900">
                  {t.trap}
                </td>
                <td className="border-b border-iron-300 px-5 py-3.5">
                  <span className="inline-flex items-start gap-1.5 text-signal-critical">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    {t.naive}
                  </span>
                </td>
                <td className="border-b border-iron-300 px-5 py-3.5">
                  <span className="inline-flex items-start gap-1.5 text-signal-good">
                    <Check size={13} className="mt-0.5 shrink-0" />
                    {t.ours}
                  </span>
                </td>
                <td className="max-w-[38ch] border-b border-iron-300 px-5 py-3.5 leading-snug text-jb-600">
                  {t.why}
                  <div className="mt-1.5 font-mono text-[10.5px] text-jb-400">{t.where}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded border border-jb-300 bg-jb-50 p-5">
        <Eyebrow>Reproduce it</Eyebrow>
        <p className="mt-2 max-w-[72ch] text-[13px] leading-relaxed text-jb-700">
          Every headline figure in this application is printed with its source rows by a single
          command, so any claim can be checked against the supplied dataset in seconds.
        </p>
        <pre className="mt-3 overflow-x-auto rounded border border-jb-200 bg-white px-4 py-3 font-mono text-[12.5px] text-jb-800">
          {data?.verify ?? 'python backend/verify.py'}
        </pre>
      </div>
    </div>
  )
}
