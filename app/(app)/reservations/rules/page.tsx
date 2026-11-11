import type { Metadata } from 'next'

import { NEW_RULE, RULE_PARAM, ruleTermsOfSearch } from '@/lib/rules'
import {
  rawSearchConditionOf,
  readSearchCondition,
  searchTermsOf,
} from '@/lib/search-condition'
import { RULES_EVENT } from '@/repository/events'
import { listPickableChannels } from '@/repository/programs'
import type { Rule } from '@/repository/rules'
import { listRules } from '@/repository/rules'
import { countAheadByRule } from '@/repository/reservations'
import { RefreshOnSignal } from '@/components/vela/refresh-on-signal'
import type { RuleEditing } from '@/components/reservations/rules-view'
import { RulesView } from '@/components/reservations/rules-view'
import {
  applyRules,
  dropRule,
  rehearseRule,
  saveRule,
  turnRule,
  weighRule,
} from '@/app/(app)/reservations/rules/actions'

export const metadata: Metadata = { title: 'ルール' }

type Asked = Record<string, string | string[] | undefined>

function editingOf(params: Asked, rules: Rule[]): RuleEditing {
  const asked = params[RULE_PARAM]

  if (typeof asked !== 'string') {
    return { state: 'none' }
  }

  if (asked === NEW_RULE) {
    return {
      state: 'new',
      terms: ruleTermsOfSearch(
        searchTermsOf(readSearchCondition(rawSearchConditionOf(params))),
      ),
    }
  }

  const rule = rules.find((one) => one.id === asked)

  return rule ? { state: 'rule', rule } : { state: 'none' }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Asked>
}) {
  const params = await searchParams
  const [result, channels, ahead] = await Promise.all([
    listRules(),
    listPickableChannels(),
    countAheadByRule().catch(() => undefined),
  ])

  return (
    <>
      <RefreshOnSignal events={[RULES_EVENT]} />
      <RulesView
        result={result}
        channels={channels}
        editing={editingOf(params, result.items)}
        ahead={ahead && Object.fromEntries(ahead)}
        actions={{
          onSave: saveRule,
          onDelete: dropRule,
          onSwitch: turnRule,
          onPreview: rehearseRule,
          onImpact: weighRule,
          onApply: applyRules,
        }}
      />
    </>
  )
}
