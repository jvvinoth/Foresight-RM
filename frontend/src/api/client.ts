import { useQuery } from '@tanstack/react-query'
import type { Client, Finding } from '../types'

/** Relative — FastAPI serves the built UI, so there is no base URL to misconfigure. */
async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`)
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json() as Promise<T>
}

export interface BookRow {
  id: string
  rank: number
  name: string
  aumUsd: number
  wealthBand: string
  language: string
  score: number
  gate: Client['gate']
  reason: string
  findings: number
  lastContactDays: number | null
  kycOverdue: boolean
  agents: string[]
}

export interface Stat {
  label: string
  value: string
  sub: string
  tone?: 'critical' | 'good' | 'gold'
}

export interface Rm {
  id: string
  name: string
  desk: string
  email: string
  asOf: string
  clients: number
  portfolios: number
  positions: number
  notes: number
  events: number
}

export interface Constraint {
  text: string
  blocking?: boolean
  sensitive?: boolean
  revisit?: string | null
}

export interface Relationship {
  client_id: string
  name: string
  language: string
  tenure_years: number
  since: string
  last_contact_days: number | null
  kyc_due: string
  kyc_overdue: boolean
  source_of_wealth: string
  life_stage: string
  risk_profile: string
  risk_score: number
  objectives: string
  residence: string
  tax_domicile: string
  cross_border: boolean
  booking_centre: string
  constraints: Constraint[]
  entry_point: string | null
  said: { id: string; date: string; channel: string; quote: string }[]
  tone: string
  avoid: string
}

export interface Trace {
  agent: string
  ms: number
  found: number
  kind: 'deterministic' | 'model'
}

export interface RevealRow {
  label: string
  pct: number
  usd: number
  kind: 'core' | 'adjacent'
  wrapper: string | null
}

export interface Reveal {
  label: string
  corePct: number
  allPct: number
  rows: RevealRow[]
  outside: { label: string; detail: string; system: string }[]
}

export interface Outlook {
  facility: string | null
  currency?: string
  trigger?: number
  ltv?: number
  headroom?: number
  drawn?: number
  path?: { date: string; ltv: number; drawn: number; collateral: number; breach: boolean }[]
  shocks: { shock: string; ltv: number; breach: boolean }[]
}

export interface Brief {
  open_with: string
  do_not_lead_with: string
  one_number: string
  language: string
  raise: Finding[]
  held: Finding[]
}

export interface Handover {
  name: string
  language: string
  tenureYears: number
  since: string
  sourceOfWealth: string
  lifeStage: string
  objectives: string
  crossBorder: boolean
  residence: string
  taxDomicile: string
  beliefs: string[]
  doNot: string[]
  openActions: string[]
  lastContactDays: number | null
  kycDue: string
  kycOverdue: boolean
}

export interface Trap {
  trap: string
  naive: string
  ours: string
  why: string
  where: string
}

export const useBook = () =>
  useQuery({
    queryKey: ['book'],
    queryFn: () => get<{ rm: Rm; stats: Stat[]; clients: BookRow[] }>('/book'),
  })

export const useClient = (id: string) =>
  useQuery({
    queryKey: ['client', id],
    queryFn: () =>
      get<{
        id: string
        name: string
        aumUsd: number
        wealthBand: string
        relationship: Relationship
        score: number
        gate: Client['gate']
      }>(`/clients/${id}`),
    enabled: Boolean(id),
  })

export const useFindings = (id: string) =>
  useQuery({
    queryKey: ['findings', id],
    queryFn: () => get<{ findings: Finding[]; trace: Trace[] }>(`/clients/${id}/findings`),
    enabled: Boolean(id),
  })

export const useReveal = (id: string, on: boolean) =>
  useQuery({
    queryKey: ['reveal', id],
    queryFn: () => get<Reveal>(`/clients/${id}/reveal`),
    enabled: Boolean(id) && on,
  })

export const useOutlook = (id: string, on: boolean) =>
  useQuery({
    queryKey: ['outlook', id],
    queryFn: () => get<Outlook>(`/clients/${id}/outlook`),
    enabled: Boolean(id) && on,
  })

export const useBrief = (id: string, on: boolean) =>
  useQuery({
    queryKey: ['brief', id],
    queryFn: () => get<Brief>(`/clients/${id}/brief`),
    enabled: Boolean(id) && on,
  })

export const useHandover = (id: string, on: boolean) =>
  useQuery({
    queryKey: ['handover', id],
    queryFn: () => get<Handover>(`/clients/${id}/handover`),
    enabled: Boolean(id) && on,
  })

export const useIntegrity = () =>
  useQuery({
    queryKey: ['integrity'],
    queryFn: () => get<{ traps: Trap[]; verify: string }>('/integrity'),
  })

export async function generateDraft(id: string) {
  const res = await fetch(`/api/clients/${id}/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) throw new Error('draft failed')
  return res.json() as Promise<{ subject: string; body: string }>
}

export async function approve(id: string, payload: {
  action: string
  ai_draft: string
  final_text: string
  finding_ids: string[]
}) {
  const res = await fetch(`/api/clients/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('approve failed')
  return res.json() as Promise<{ id: number; ts: string; edited: boolean }>
}
