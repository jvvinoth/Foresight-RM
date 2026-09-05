import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'
import { DeviceFrame, DeviceToggle, useDevice } from './DeviceFrame'
import { useBook } from '../api/client'

function Logo() {
  return (
    <Link to="/dashboard" className="flex items-baseline gap-2.5">
      <span className="font-display text-[19px] leading-none tracking-tight text-white">
        Foresight
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">RM</span>
    </Link>
  )
}

const NAV = [
  { to: '/dashboard', label: 'Priority Radar' },
  { to: '/agents', label: 'The Desk' },
]

export function Shell({ children }: { children: ReactNode }) {
  const { device, setDevice } = useDevice()
  const inner = <ShellBody device={device} setDevice={setDevice}>{children}</ShellBody>
  if (device === 'desktop') return inner
  return <DeviceFrame device={device}>{inner}</DeviceFrame>
}

function ShellBody({
  children,
  device,
  setDevice,
}: {
  children: ReactNode
  device: Parameters<typeof DeviceToggle>[0]['device']
  setDevice: Parameters<typeof DeviceToggle>[0]['setDevice']
}) {
  const nav = useNavigate()
  const { data } = useBook()
  const rm = data?.rm

  return (
    <div className="@container flex min-h-full flex-col bg-iron-100">
      <header className="sticky top-0 z-30 bg-jb-900">
        <div className="mx-auto flex max-w-[1420px] items-center gap-8 px-6 py-3">
          <Logo />

          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `rounded px-3 py-1.5 text-[13px] transition-colors ${
                    isActive ? 'bg-white/12 text-white' : 'text-white/60 hover:text-white'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-5">
            <DeviceToggle device={device} setDevice={setDevice} />
            <div className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/45 @5xl:flex">
              <ShieldCheck size={12} strokeWidth={2} />
              Snapshot {rm?.asOf ?? '—'}
            </div>
            <div className="hidden text-right leading-tight @3xl:block">
              <div className="text-[13px] text-white">{rm?.name ?? ''}</div>
              <div className="font-mono text-[10px] text-white/45">{rm?.id ?? ''}</div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('foresight.rm')
                nav('/')
              }}
              title="Sign out"
              className="rounded p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1420px] flex-1 px-6 py-7">{children}</main>

      <footer className="border-t border-iron-400 bg-white">
        <div className="mx-auto flex max-w-[1420px] flex-wrap items-center gap-x-6 gap-y-1 px-6 py-4 text-[11px] text-jb-400">
          <span>Foresight Labs · SingHacks 2026</span>
          <NavLink to="/integrity" className="underline-offset-2 hover:text-jb-700 hover:underline">
            Data integrity register
          </NavLink>
          <span>Synthetic data supplied by Julius Baer. Not investment advice.</span>
          <span className="font-mono">
            Detectors compute · agents narrate · no agent originates a number
          </span>
        </div>
      </footer>
    </div>
  )
}
