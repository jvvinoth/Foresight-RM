import type { AgentDef, AgentId } from '../types'

export const AGENTS: AgentDef[] = [
  {
    id: 'monitor',
    index: 1,
    name: 'Monitor',
    question: 'What changed since you last looked?',
    role: 'Diffs 20 clients across five snapshots. Change, not state.',
    kind: 'deterministic',
    isNew: true,
  },
  {
    id: 'exposure',
    index: 2,
    name: 'Exposure',
    question: 'What is this client actually exposed to?',
    role: 'Look-through to underlying, cross-portfolio aggregation, source of wealth.',
    kind: 'deterministic',
  },
  {
    id: 'resilience',
    index: 3,
    name: 'Resilience',
    question: 'What breaks first?',
    role: 'LTV path across snapshots, gate-aware liquidity, shock scenarios.',
    kind: 'deterministic',
  },
  {
    id: 'opportunity',
    index: 4,
    name: 'Opportunity',
    question: 'What is unclaimed?',
    role: 'Idle cash, unfunded plans, stated ambitions, promises never kept.',
    kind: 'deterministic',
    isNew: true,
  },
  {
    id: 'suitability',
    index: 5,
    name: 'Suitability',
    question: 'Is it a breach, or is it authorised?',
    role: 'Bands by service model, waiver register, binding exclusions.',
    kind: 'deterministic',
  },
  {
    id: 'relationship',
    index: 6,
    name: 'Relationship',
    question: 'How should she say it — and should she?',
    role: 'Language, intent, sensitivities, constraints from 28 RM notes.',
    kind: 'model',
  },
]

export const AGENT_MAP: Record<AgentId, AgentDef> = Object.fromEntries(
  AGENTS.map((a) => [a.id, a]),
) as Record<AgentId, AgentDef>
