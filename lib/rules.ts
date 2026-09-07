import type { SearchTerms } from '@/lib/search-condition'
import {
  SEARCH_DEFAULT_FIELDS,
  SEARCH_FIELD_OPTIONS,
  SEARCH_KIND_OPTIONS,
  genreLabelOf,
} from '@/lib/search-condition'

export const RULE_NAME_LONGEST = 128

export const RULE_PARAM = 'rule'

export const NEW_RULE = 'new'

export const RULE_DEFAULT_PRIORITY = 10

export const RULE_TAKES_SHOWN = 20

export function withinRuleName(value: string): boolean {
  const named = value.trim()

  return named.length > 0 && named.length <= RULE_NAME_LONGEST
}

export function ruleNarrowsAnything(terms: SearchTerms): boolean {
  return Boolean(
    terms.q ||
    terms.exclude ||
    terms.genres.length ||
    terms.kind ||
    terms.channels.length,
  )
}

export function ruleConditionParts(
  terms: SearchTerms,
  channelNameOf: (id: string) => string,
): string[] {
  const parts: string[] = []

  if (terms.q) {
    parts.push(`「${terms.q}」`)
  }

  if (terms.exclude) {
    parts.push(`除外「${terms.exclude}」`)
  }

  if (terms.fields !== SEARCH_DEFAULT_FIELDS) {
    parts.push(
      SEARCH_FIELD_OPTIONS.find((option) => option.value === terms.fields)
        ?.label ?? terms.fields,
    )
  }

  if (terms.genres.length > 0) {
    parts.push(`ジャンル: ${terms.genres.map(genreLabelOf).join('・')}`)
  }

  if (terms.kind) {
    parts.push(
      SEARCH_KIND_OPTIONS.find((option) => option.value === terms.kind)
        ?.label ?? terms.kind,
    )
  }

  parts.push(
    terms.channels.length === 0
      ? 'すべてのチャンネル'
      : terms.channels.length === 1
        ? channelNameOf(terms.channels[0])
        : `${terms.channels.length} チャンネル`,
  )

  return parts
}
