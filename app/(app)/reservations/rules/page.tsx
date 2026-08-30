import type { Metadata } from 'next'

import { NEW_RULE, RULE_PARAM } from '@/lib/rules'
import {
  rawSearchConditionOf,
  readSearchCondition,
  searchTermsOf,
} from '@/lib/search-condition'
import { listPickableChannels } from '@/repository/programs'
import type { Rule } from '@/repository/rules'
import { listRules } from '@/repository/rules'
import type { RuleEditing } from '@/components/reservations/rules-page'
import { RulesView } from '@/components/reservations/rules-page'
import {
  dropRule,
  rehearseRule,
  saveRule,
  turnRule,
  weighRule,
} from '@/app/(app)/reservations/rules/actions'

export const metadata: Metadata = { title: 'ルール' }

type Asked = Record<string, string | string[] | undefined>

/**
 * Which rule the address opens. A new one starts from the conditions the
 * address carries, spelled the way the search screen spells them, which is
 * what lets 「この条件でルールを作る」 be a link and nothing more.
 */
function editingOf(params: Asked, rules: Rule[]): RuleEditing {
  const asked = params[RULE_PARAM]

  if (typeof asked !== 'string') {
    return { state: 'none' }
  }

  if (asked === NEW_RULE) {
    return {
      state: 'new',
      terms: searchTermsOf(readSearchCondition(rawSearchConditionOf(params))),
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
  const [result, channels] = await Promise.all([
    listRules(),
    listPickableChannels(),
  ])

  return (
    <RulesView
      result={result}
      channels={channels}
      editing={editingOf(params, result.items)}
      actions={{
        onSave: saveRule,
        onDelete: dropRule,
        onSwitch: turnRule,
        onPreview: rehearseRule,
        onImpact: weighRule,
      }}
    />
  )
}
