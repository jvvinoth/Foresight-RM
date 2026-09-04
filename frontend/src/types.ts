export type AgentId =
  | 'monitor'
  | 'exposure'
  | 'resilience'
  | 'opportunity'
  | 'suitability'
  | 'relationship'

export type Gate = 'raise' | 'reframe' | 'hold' | 'authorised'
export type Tense = 'now' | 'next' | 'act'
export type Severity = 'critical' | 'high' | 'medium' | 'info'

export interface Evidence {
  kind: 'file' | 'note' | 'event'
  source: string
  ref: string
  detail: string
}

export interface Metric {
  label: string
  value: string
  alert?: boolean
  sub?: string
}

export interface Finding {
  id: string
  clientId: string
  agent: AgentId
  tense: Tense
  severity: Severity
  title: string
  headline: string
  body: string
  gate: Gate
  gateReason: string
  revisit?: string
  metrics?: Metric[]
  evidence: Evidence[]
  materiality?: number
  urgency?: number
}

export interface SaidItem {
  id: string
  date: string
  channel: string
  quote: string
}

export interface Client {
  id: string
  name: string
  rank: number
  score: number
  reason: string
  gate: Gate
  aumUsd: number
  wealthBand: 'HNW' | 'UHNW'
  language: string
  languageNative: string
  since: string
  tenureYears: number
  age: number
  lifeStage: string
  sourceOfWealth: string
  riskProfile: string
  riskScore: number
  bookingCentre: string
  residence: string
  taxDomicile: string
  objectives: string
  lastContactDays: number
  kycDue: string
  constraints: string[]
  said: SaidItem[]
}

export interface AgentDef {
  id: AgentId
  index: number
  name: string
  question: string
  role: string
  kind: 'deterministic' | 'model'
  isNew?: boolean
}

export interface RevealRow {
  label: string
  pct: number
  usd: number
  kind: 'core' | 'adjacent'
  wrapper?: string
}

export interface OutsideItem {
  label: string
  detail: string
  system: string
}

export interface ShockPoint {
  shock: string
  ltv: number
  breach: boolean
}
