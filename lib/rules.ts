import type { Route } from 'next'

import { formatCalendarDate } from '@/lib/format'
import type { Moment } from '@/lib/format'
import { mainTitleOf } from '@/lib/program-title'
import type { SearchTerms } from '@/lib/search-condition'
import {
  SEARCH_DEFAULT_FIELDS,
  SEARCH_FIELD_OPTIONS,
  SEARCH_KIND_OPTIONS,
  genreLabelOf,
  searchTermsQueryOf,
} from '@/lib/search-condition'
import { subgenreLabelOf } from '@/lib/subgenres'

export type RuleDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export type RuleMark =
  | 'New'
  | 'Premiere'
  | 'Final'
  | 'Rerun'
  | 'FirstPart'
  | 'SecondPart'
  | 'Live'
  | 'Film'
  | 'News'
  | 'Weather'
  | 'Traffic'
  | 'Shopping'
  | 'VoiceCast'
  | 'Dubbed'
  | 'Captioned'
  | 'SignLanguage'
  | 'AudioDescription'
  | 'Bilingual'
  | 'MultipleAudio'
  | 'Stereo'
  | 'SurroundStereo'
  | 'BModeStereo'
  | 'HighDefinition'
  | 'StandardDefinition'
  | 'Progressive'
  | 'Widescreen'
  | 'MultiView'
  | 'DataBroadcast'
  | 'Interactive'
  | 'Free'
  | 'Paid'
  | 'PayPerView'
  | 'ParentalLock'

export type RuleConditionBeyond = [name: string, value: string]

export interface RuleTerms extends SearchTerms {
  subgenres: string[]
  days: RuleDay[]
  marks: RuleMark[]
  excludedMarks: RuleMark[]
  beyond: RuleConditionBeyond[]
}

export const RULE_NAME_LONGEST = 128

export const RULE_PARAM = 'rule'

export const NEW_RULE = 'new'

export const RULE_DEFAULT_PRIORITY = 10

export const RULE_TAKES_SHOWN = 20

export const RULE_DAY_OPTIONS: {
  value: RuleDay
  label: string
  short: string
}[] = [
  { value: 'monday', label: '月曜', short: '月' },
  { value: 'tuesday', label: '火曜', short: '火' },
  { value: 'wednesday', label: '水曜', short: '水' },
  { value: 'thursday', label: '木曜', short: '木' },
  { value: 'friday', label: '金曜', short: '金' },
  { value: 'saturday', label: '土曜', short: '土' },
  { value: 'sunday', label: '日曜', short: '日' },
]

export const RULE_MARK_OPTIONS: { value: RuleMark; label: string }[] = [
  { value: 'New', label: '新番組' },
  { value: 'Premiere', label: '初放送' },
  { value: 'Final', label: '最終回' },
  { value: 'Rerun', label: '再放送' },
  { value: 'FirstPart', label: '前編' },
  { value: 'SecondPart', label: '後編' },
  { value: 'Live', label: '生放送' },
  { value: 'Film', label: '映画' },
  { value: 'News', label: 'ニュース' },
  { value: 'Weather', label: '天気予報' },
  { value: 'Traffic', label: '交通情報' },
  { value: 'Shopping', label: '通信販売' },
  { value: 'VoiceCast', label: '声の出演' },
  { value: 'Dubbed', label: '吹替' },
  { value: 'Captioned', label: '字幕' },
  { value: 'SignLanguage', label: '手話' },
  { value: 'AudioDescription', label: '解説放送' },
  { value: 'Bilingual', label: '二カ国語' },
  { value: 'MultipleAudio', label: '多重音声' },
  { value: 'Stereo', label: 'ステレオ' },
  { value: 'SurroundStereo', label: 'サラウンドステレオ' },
  { value: 'BModeStereo', label: '圧縮 B モードステレオ' },
  { value: 'HighDefinition', label: 'ハイビジョン' },
  { value: 'StandardDefinition', label: '標準画質' },
  { value: 'Progressive', label: 'プログレッシブ' },
  { value: 'Widescreen', label: 'ワイド' },
  { value: 'MultiView', label: 'マルチビュー' },
  { value: 'DataBroadcast', label: 'データ放送' },
  { value: 'Interactive', label: '双方向放送' },
  { value: 'Free', label: '無料放送' },
  { value: 'Paid', label: '有料放送' },
  { value: 'PayPerView', label: 'ペイパービュー' },
  { value: 'ParentalLock', label: '視聴制限' },
]

export const RULE_PERIOD_LONGEST_DAYS = 31

const A_DAY_MS = 24 * 60 * 60 * 1000

const PERIOD_TILDE = '〜'

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
  return {
    ...terms,
    subgenres: [],
    days: [],
    marks: [],
    excludedMarks: [],
    beyond: [],
  }
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
    terms.marks.length ||
    terms.excludedMarks.length ||
    terms.from ||
    terms.to ||
    terms.beyond.length,
  )
}

function namesSomeDays(days: RuleDay[]): boolean {
  return days.length > 0 && days.length < RULE_DAY_OPTIONS.length
}

export function ruleDaysInOrder(days: RuleDay[]): RuleDay[] {
  return RULE_DAY_OPTIONS.map((option) => option.value).filter((day) =>
    days.includes(day),
  )
}

export function ruleDayLabelOf(day: RuleDay): string {
  return RULE_DAY_OPTIONS.find((option) => option.value === day)?.label ?? day
}

export function ruleMarksInOrder(marks: RuleMark[]): RuleMark[] {
  return RULE_MARK_OPTIONS.map((option) => option.value).filter((mark) =>
    marks.includes(mark),
  )
}

export function ruleMarkLabelOf(mark: RuleMark): string {
  return (
    RULE_MARK_OPTIONS.find((option) => option.value === mark)?.label ?? mark
  )
}

function markLabelsOf(marks: RuleMark[]): string {
  return ruleMarksInOrder(marks).map(ruleMarkLabelOf).join('・')
}

export function withinRulePeriod(
  from: string | undefined,
  to: string | undefined,
): boolean {
  if (!from || !to) {
    return true
  }

  const days =
    (new Date(`${to}T00:00:00Z`).getTime() -
      new Date(`${from}T00:00:00Z`).getTime()) /
      A_DAY_MS +
    1

  return days >= 1 && days <= RULE_PERIOD_LONGEST_DAYS
}

export function rulePeriodLabelOf(
  from: string | undefined,
  to: string | undefined,
  now: Moment = Date.now(),
): string {
  return [
    from ? formatCalendarDate(from, now) : undefined,
    PERIOD_TILDE,
    to ? formatCalendarDate(to, now) : undefined,
  ]
    .filter((part) => part !== undefined)
    .join(' ')
}

export function ruleConditionParts(
  terms: RuleTerms,
  channelNameOf: (id: string) => string,
  now: Moment = Date.now(),
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

  const genres = [
    ...terms.genres.map(genreLabelOf),
    ...terms.subgenres.map(subgenreLabelOf),
  ]

  if (genres.length > 0) {
    parts.push(`ジャンル: ${genres.join('・')}`)
  }

  if (terms.kind) {
    parts.push(
      SEARCH_KIND_OPTIONS.find((option) => option.value === terms.kind)
        ?.label ?? terms.kind,
    )
  }

  if (terms.days.length > 0) {
    const days = RULE_DAY_OPTIONS.filter((option) =>
      terms.days.includes(option.value),
    ).map((option) => option.short)

    parts.push(`曜日: ${days.join('・')}`)
  }

  if (terms.marks.length > 0) {
    parts.push(`印: ${markLabelsOf(terms.marks)}`)
  }

  if (terms.excludedMarks.length > 0) {
    parts.push(`除外する印: ${markLabelsOf(terms.excludedMarks)}`)
  }

  if (terms.from || terms.to) {
    parts.push(`期間: ${rulePeriodLabelOf(terms.from, terms.to, now)}`)
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

export interface RuleApplicationPart {
  label: string
  count: number
}

interface RuleApplicationCounts {
  made: number
  withdrawn: number
  refused: number
  turnedOff: number
  faulted: number
}

export function ruleApplicationPartsOf(
  applied: RuleApplicationCounts,
): RuleApplicationPart[] {
  return [
    { label: '新しく作られた予約', count: applied.made },
    ...[
      { label: '引っ込んだ予約', count: applied.withdrawn },
      { label: '作成できなかった予約', count: applied.refused },
      { label: '条件を読めず無効にしたルール', count: applied.turnedOff },
      { label: '調べられなかったルール', count: applied.faulted },
    ].filter((part) => part.count > 0),
  ]
}

export function ruleApplicationFellShort(
  applied: RuleApplicationCounts,
): boolean {
  return applied.refused + applied.turnedOff + applied.faulted > 0
}
