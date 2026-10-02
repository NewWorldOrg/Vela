import type { Route } from 'next'

import { mainTitleOf } from '@/lib/program-title'
import type { SearchTerms } from '@/lib/search-condition'
import {
  SEARCH_DEFAULT_FIELDS,
  SEARCH_FIELD_OPTIONS,
  SEARCH_KIND_OPTIONS,
  genreLabelOf,
  searchTermsQueryOf,
} from '@/lib/search-condition'

export const RULE_NAME_LONGEST = 128

export const RULE_PARAM = 'rule'

export const NEW_RULE = 'new'

export const RULE_DEFAULT_PRIORITY = 10

export const RULE_TAKES_SHOWN = 20

export type RuleDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export const RULE_DAY_OPTIONS: { value: RuleDay; label: string }[] = [
  { value: 'monday', label: '月曜' },
  { value: 'tuesday', label: '火曜' },
  { value: 'wednesday', label: '水曜' },
  { value: 'thursday', label: '木曜' },
  { value: 'friday', label: '金曜' },
  { value: 'saturday', label: '土曜' },
  { value: 'sunday', label: '日曜' },
]

export type RuleConditionBeyond = [name: string, value: string]

export interface RuleTerms extends SearchTerms {
  subgenres: string[]
  days: RuleDay[]
  beyond: RuleConditionBeyond[]
}

const RULES_PATH = '/reservations/rules'

export function newRuleHref(terms: SearchTerms): Route {
  const opening = `${RULES_PATH}?${RULE_PARAM}=${NEW_RULE}`
  const query = searchTermsQueryOf(terms)

  return (query ? `${opening}&${query}` : opening) as Route
}

export function seriesTermsOf(
  title: string,
  channelId: string,
): SearchTerms | undefined {
  const main = mainTitleOf(title)

  if (!main) {
    return undefined
  }

  return {
    q: main,
    exclude: undefined,
    fields: 'title',
    genres: [],
    kind: undefined,
    channels: [channelId],
  }
}

export function ruleTermsOfSearch(terms: SearchTerms): RuleTerms {
  return { ...terms, subgenres: [], days: [], beyond: [] }
}

export function withinRuleName(value: string): boolean {
  const named = value.trim()

  return named.length > 0 && named.length <= RULE_NAME_LONGEST
}

export function ruleNarrowsAnything(terms: RuleTerms): boolean {
  return Boolean(
    terms.q ||
    terms.exclude ||
    terms.genres.length ||
    terms.subgenres.length ||
    terms.kind ||
    terms.channels.length ||
    namesSomeDays(terms.days) ||
    terms.from ||
    terms.to ||
    terms.beyond.length,
  )
}

function namesSomeDays(days: RuleDay[]): boolean {
  return days.length > 0 && days.length < RULE_DAY_OPTIONS.length
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

export interface ExclusionPart {
  label: string
  count: number
}

export function exclusionPartsOf(excluded: {
  shadows: number
  moved: number
}): ExclusionPart[] {
  return [
    { label: '同時放送', count: excluded.shadows },
    { label: '移動', count: excluded.moved },
  ].filter((part) => part.count > 0)
}
