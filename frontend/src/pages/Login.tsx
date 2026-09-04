import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Lock } from 'lucide-react'
const RM = {
  id: 'RM-SG-014',
  email: 'priscilla.ong@juliusbaer.com',
}
const FACTS: [string, string][] = [
  ['20', 'clients'],
  ['6', 'agents'],
  ['12', 'source files'],
  ['28', 'RM notes'],
]

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState(RM.email)
  const [pw, setPw] = useState('••••••••••')
  const [busy, setBusy] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    localStorage.setItem('foresight.rm', RM.id)
    setTimeout(() => nav('/dashboard'), 550)
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
      {/* left — brand panel */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-jb-900 px-10 py-12 text-white lg:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(113,134,211,0.22) 0%, rgba(20,30,85,0) 68%)',
          }}
        />
        <div className="relative flex items-baseline gap-3">
          <span className="font-display text-[22px] leading-none">Foresight</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/50">RM</span>
        </div>

        <div className="relative max-w-[30rem]">
          <p
            className="font-display text-[30px] leading-[1.24] lg:text-[38px]"
          >
            The bank already knows.
            <br />
            <span className="text-jb-300">It has never told anyone.</span>
          </p>
          <p
            className="mt-6 max-w-[38ch] text-[14px] leading-relaxed text-white/65"
          >
            Twenty clients. Six languages. Twelve systems that never speak to each other. Foresight
            reads them together and tells you who to call, what changed, what could change next, and
            how to raise it with this particular person.
          </p>

          <div className="mt-10 flex gap-8 border-t border-white/12 pt-6">
            {FACTS.map(([v, l]) => (
              <div key={l}>
                <div className="tnum font-display text-[22px] leading-none">{v}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
          Julius Baer · Wealth Intelligence · SingHacks 2026
        </div>
      </div>

      {/* right — sign in */}
      <div className="flex items-center justify-center bg-white px-8 py-16">
        <form onSubmit={submit} className="w-full max-w-[360px]">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-jb-400">
            Relationship Manager access
          </div>
          <h1 className="mt-2 font-display text-[27px] leading-tight text-jb-900">Sign in</h1>
          <p className="mt-2 text-[13px] leading-snug text-jb-500">
            Your book, your desk, your snapshot. Access is scoped to the clients you cover.
          </p>

          <label className="mt-8 block">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-jb-400">
              Corporate email
            </span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded border border-iron-500 px-3 py-2.5 text-[14px] text-jb-900 outline-none transition-colors focus:border-jb-600 focus:ring-2 focus:ring-jb-200"
            />
          </label>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-jb-400">
              Password
            </span>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="mt-1.5 w-full rounded border border-iron-500 px-3 py-2.5 text-[14px] text-jb-900 outline-none transition-colors focus:border-jb-600 focus:ring-2 focus:ring-jb-200"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded bg-jb-900 px-4 py-3 text-[14px] font-medium text-white transition-colors hover:bg-jb-800 disabled:opacity-70"
          >
            {busy ? 'Loading your book…' : 'Sign in'}
            {!busy && <ArrowRight size={15} />}
          </button>

          <div className="mt-6 flex items-start gap-2 rounded border border-iron-400 bg-iron-100 px-3 py-2.5">
            <Lock size={13} className="mt-0.5 shrink-0 text-jb-400" />
            <p className="text-[11.5px] leading-snug text-jb-500">
              Demo build — credentials are pre-filled and no data leaves this browser. In production
              this is bank SSO, and the RM identity scopes every query.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
