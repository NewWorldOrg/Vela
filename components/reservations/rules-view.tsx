'use client'

import { NEW_RULE } from '@/lib/rules'
import type { GuideChannel } from '@/repository/programs'
import type {
  Rule,
  RuleApplication,
  RuleDraft,
  RuleImpact,
  RulePreview,
  RuleRetirement,
  RulesResult,
  RuleTerms,
  RuleWrite,
} from '@/repository/rules'
import { searchTermsQueryOf } from '@/repository/search-options'
import { RulesScreen } from '@/components/reservations/rules/rules-screen'

export type RuleEditing =
  | { state: 'none' }
  | { state: 'new'; terms: RuleTerms }
  | { state: 'rule'; rule: Rule }

export interface RuleActions {
  onSave: (id: string | undefined, draft: RuleDraft) => Promise<RuleWrite<Rule>>
  onDelete: (id: string) => Promise<RuleWrite<RuleRetirement>>
  onSwitch: (id: string, enabled: boolean) => Promise<RuleWrite<number>>
  onPreview: (draft: RuleDraft, id?: string) => Promise<RuleWrite<RulePreview>>
  onImpact: (draft: RuleDraft, id?: string) => Promise<RuleWrite<RuleImpact>>
  onApply: (id: string) => Promise<RuleWrite<RuleApplication>>
}

export function RulesView({
  result,
  channels,
  editing,
  actions,
  ahead,
}: {
  result: RulesResult
  channels: GuideChannel[]
  editing: RuleEditing
  actions: RuleActions
  /** How many reservations each rule still has ahead of it, by the rule's id; left out when they cannot be counted. */
  ahead?: Readonly<Record<string, number>>
}) {
  return (
    <RulesScreen
      key={keyOf(editing)}
      result={result}
      channels={channels}
      editing={editing}
      actions={actions}
      ahead={ahead}
    />
  )
}

function keyOf(editing: RuleEditing): string {
  if (editing.state === 'rule') {
    return `${editing.rule.id}:${editing.rule.enabled}`
  }

  return editing.state === 'new'
    ? `${NEW_RULE}?${searchTermsQueryOf(editing.terms)}`
    : 'none'
}
