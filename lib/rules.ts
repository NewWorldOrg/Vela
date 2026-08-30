import type { SearchTerms } from '@/lib/search-condition'
import {
  SEARCH_DEFAULT_FIELDS,
  SEARCH_FIELD_OPTIONS,
  SEARCH_KIND_OPTIONS,
  genreLabelOf,
} from '@/lib/search-condition'

/**
 * The bounds the API holds a rule to. They live outside `repository/` so the
 * form that has to say them can read them without reaching the API.
 */
export const RULE_NAME_LONGEST = 128

/** The address key the rule editor is opened by, and what a new rule is spelled as. */
export const RULE_PARAM = 'rule'

export const NEW_RULE = 'new'

export const RULE_DEFAULT_PRIORITY = 10

/**
 * How many preview rows a screen is handed. The API answers a rehearsal with
 * every programme the conditions reach, which on a broad condition is the
 * greater part of the guide; the count beside the rows is what says how many
 * there were.
 */
export const RULE_TAKES_SHOWN = 20

export function withinRuleName(value: string): boolean {
  const named = value.trim()

  return named.length > 0 && named.length <= RULE_NAME_LONGEST
}

/**
 * Whether the conditions narrow the guide at all. Where they narrow nothing
 * the rule would take every programme there is, which the API refuses rather
 * than saves; where the parts a keyword is looked for in are the only answer,
 * nothing is narrowed either, because they only say where to look.
 */
export function ruleNarrowsAnything(terms: SearchTerms): boolean {
  return Boolean(
    terms.q ||
    terms.exclude ||
    terms.genres.length ||
    terms.kind ||
    terms.channels.length,
  )
}

/**
 * The conditions in one line, in the order the form asks for them. Each piece
 * stands on its own so the caller joins them the way its row is drawn.
 */
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
