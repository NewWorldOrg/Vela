import { formatBroadcastSpan, formatBroadcastStart } from '@/lib/format'
import { RULE_TAKES_SHOWN } from '@/lib/rules'
import type { SearchTerms } from '@/lib/search-condition'
import {
  SEARCH_DEFAULT_FIELDS,
  SEARCH_GENRE_OPTIONS,
  SEARCH_KIND_OPTIONS,
  readSearchCondition,
  searchTermsOf,
} from '@/lib/search-condition'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import type { GuideChannel } from '@/repository/programs'
import { fetchServiceChannels } from '@/repository/programs'
import {
  SEARCH_FIELDS_OF,
  SEARCH_SYSTEM_OF_KIND,
  toInt,
} from '@/repository/programmes'
import type { AllocationVerdict } from '@/repository/reservations'
import { whatItSaid } from '@/repository/said'

type RuleResponder = components['schemas']['RuleResponder']
type RulePreviewResponder = components['schemas']['RulePreviewResponder']
type RulePreviewTakeResponder =
  components['schemas']['RulePreviewTakeResponder']
type RuleImpactResponder = components['schemas']['RuleImpactResponder']
type RuleApplicationResponder =
  components['schemas']['RuleApplicationResponder']
type RuleApplicationRefusedResponder =
  components['schemas']['RuleApplicationRefusedResponder']

export interface Rule {
  id: string
  name: string
  terms: SearchTerms
  priority: number
  enabled: boolean
  marginBeforeSeconds: number
  marginAfterSeconds: number
  createdAt: string
}

export interface RuleDraft {
  name: string
  terms: SearchTerms
  priority: number
  enabled: boolean
  marginBeforeSeconds: number
  marginAfterSeconds: number
}

export interface RulesResult {
  items: Rule[]
  total: number
}

export interface RuleTake {
  id: string
  whenLabel: string
  channelName: string
  channelNo?: string
  title: string
  alreadyReserved: boolean
  verdict?: AllocationVerdict
}

export interface RulePreview {
  takes: RuleTake[]
  matched: number
  making: number
  alreadyReserved: number
  contended: number
  excluded: number
}

export interface RuleImpact {
  making: number
  withdrawing: number
  sweeping: number
  changingHands: number
  excluded: number
}

export interface RuleApplication {
  read: number
  made: number
  refused: number
  withdrawn: number
  turnedOff: number
  faulted: number
}

export interface RuleRetirement {
  withdrawn: number
  swept: number
}

export type RuleWrite<T> =
  | { state: 'ok'; data: T }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

const UNREADABLE = 'ルールを読めませんでした'

const KEYWORD = 'keyword'

const EXCLUDE = 'exclude'

const FIELDS = 'fields'

const GENRE = 'genre'

const TYPE = 'type'

const CHANNEL = 'channel'

const END_UNDECIDED = '終了未定'

const WRITTEN_WRONG =
  'ルール名と条件が、保存できる形になっていません。ルール名は 1 文字以上、条件は 1 つ以上必要です。'

const GONE = 'このルールは残っていないため、'

const CANNOT_COUNT_TUNERS =
  'チューナーの空きを数えられないため、下見できませんでした。時間をおいてからお試しください。'

export function ruleQueryOf(terms: SearchTerms): string {
  const params = new URLSearchParams()

  if (terms.q) {
    params.set(KEYWORD, terms.q)
  }

  if (terms.exclude) {
    params.set(EXCLUDE, terms.exclude)
  }

  if (terms.fields !== SEARCH_DEFAULT_FIELDS) {
    for (const field of SEARCH_FIELDS_OF[terms.fields]) {
      params.append(FIELDS, field)
    }
  }

  for (const genre of terms.genres) {
    const option = SEARCH_GENRE_OPTIONS.find((one) => one.value === genre)

    if (option) {
      params.append(GENRE, String(option.kind))
    }
  }

  if (terms.kind) {
    params.set(TYPE, SEARCH_SYSTEM_OF_KIND[terms.kind])
  }

  for (const channel of terms.channels) {
    params.append(CHANNEL, channel)
  }

  return params.toString()
}

export function ruleTermsOf(query: string): SearchTerms {
  const params = new URLSearchParams(query)

  return searchTermsOf(
    readSearchCondition({
      q: params.get(KEYWORD) ?? undefined,
      exclude: params.get(EXCLUDE) ?? undefined,
      fields: fieldsOf(params.getAll(FIELDS)),
      genre: genresOf(params.getAll(GENRE)),
      type: kindOf(params.get(TYPE)),
      channel: params.getAll(CHANNEL).join(','),
    }),
  )
}

function fieldsOf(named: string[]): string | undefined {
  const wanted = named.map((one) => one.toLowerCase())
  const title = wanted.includes('title')
  const description = wanted.includes('description')

  if (title && !description) {
    return 'title'
  }

  if (description && !title) {
    return 'description'
  }

  return undefined
}

function genresOf(named: string[]): string[] {
  const kept: string[] = []

  for (const one of named) {
    const option = SEARCH_GENRE_OPTIONS.find(
      (offered) => String(offered.kind) === one.trim(),
    )

    if (option && !kept.includes(option.value)) {
      kept.push(option.value)
    }
  }

  return kept
}

function kindOf(named: string | null): string | undefined {
  if (!named) {
    return undefined
  }

  return SEARCH_KIND_OPTIONS.find(
    (option) =>
      SEARCH_SYSTEM_OF_KIND[option.value].toLowerCase() ===
      named.trim().toLowerCase(),
  )?.value
}

export async function listRules(): Promise<RulesResult> {
  const { data, error } = await carinaClient().GET('/api/rules')

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
  }

  return {
    items: data.data.rules.map(toRule),
    total: toInt(data.data.total),
  }
}

export async function ruleNames(): Promise<Map<string, string>> {
  const { items } = await listRules()

  return new Map(items.map((rule) => [rule.id, rule.name]))
}

export async function createRule(draft: RuleDraft): Promise<RuleWrite<Rule>> {
  const { data, response } = await carinaClient().POST('/api/rules', {
    body: bodyOf(draft),
  })

  return toWrite(
    response,
    () => toRule(data!.data!),
    { 400: WRITTEN_WRONG },
    'ルールを保存できませんでした。',
  )
}

export async function replaceRule(
  id: string,
  draft: RuleDraft,
): Promise<RuleWrite<Rule>> {
  const { data, response } = await carinaClient().PUT('/api/rules/{id}', {
    params: { path: { id } },
    body: bodyOf(draft),
  })

  return toWrite(
    response,
    () => toRule(data!.data!),
    { 400: WRITTEN_WRONG, 404: `${GONE}保存できませんでした。` },
    'ルールを保存できませんでした。',
  )
}

export async function switchRule(
  id: string,
  enabled: boolean,
): Promise<RuleWrite<number>> {
  const { data, response } = await carinaClient().PATCH(
    '/api/rules/{id}/enabled',
    { params: { path: { id } }, body: { enabled } },
  )

  return toWrite(
    response,
    () => toInt(data!.data!.withdrawn),
    { 404: `${GONE}切り替えられませんでした。` },
    'ルールを切り替えられませんでした。',
  )
}

export async function deleteRule(
  id: string,
): Promise<RuleWrite<RuleRetirement>> {
  const { data, response } = await carinaClient().DELETE('/api/rules/{id}', {
    params: { path: { id } },
  })

  return toWrite(
    response,
    () => ({
      withdrawn: toInt(data!.data!.withdrawn),
      swept: toInt(data!.data!.swept),
    }),
    { 404: `${GONE}削除できませんでした。` },
    'ルールを削除できませんでした。',
  )
}

export async function previewRule(
  draft: RuleDraft,
  id?: string,
): Promise<RuleWrite<RulePreview>> {
  const [{ data, response }, known] = await Promise.all([
    carinaClient().POST('/api/rules/preview', { body: draftBodyOf(draft, id) }),
    fetchServiceChannels(),
  ])

  return toWrite(
    response,
    () => toPreview(data!.data!, known),
    {
      400: '条件が絞り込みになっていないため、下見できませんでした。条件を 1 つ以上指定してください。',
      404: `${GONE}下見できませんでした。`,
      503: CANNOT_COUNT_TUNERS,
    },
    '下見できませんでした。',
  )
}

export async function impactOfRule(
  draft: RuleDraft,
  id?: string,
): Promise<RuleWrite<RuleImpact>> {
  const { data, response } = await carinaClient().POST('/api/rules/impact', {
    body: draftBodyOf(draft, id),
  })

  return toWrite(
    response,
    () => toImpact(data!.data!),
    {
      400: '条件が絞り込みになっていないため、影響を数えられませんでした。条件を 1 つ以上指定してください。',
      404: `${GONE}影響を数えられませんでした。`,
      503: 'チューナーの空きを数えられないため、影響を数えられませんでした。時間をおいてからお試しください。',
    },
    '影響を数えられませんでした。',
  )
}

export async function applyRulesNow(
  id: string,
): Promise<RuleWrite<RuleApplication>> {
  const { data, error, response } = await carinaClient().POST(
    '/api/rules/{id}/apply-now',
    { params: { path: { id } } },
  )

  if (response.status === 409) {
    return {
      state: 'rejected',
      message: refusedBecause(
        error?.data as RuleApplicationRefusedResponder | null | undefined,
      ),
    }
  }

  return toWrite(
    response,
    () => toApplication(data!.data as RuleApplicationResponder),
    { 400: WRITTEN_WRONG, 404: `${GONE}適用できませんでした。` },
    'ルールを適用できませんでした。',
  )
}

function refusedBecause(
  refusal: RuleApplicationRefusedResponder | null | undefined,
): string {
  if (refusal?.refusal === 'tooSoonAfterTheLastOne') {
    const at = refusal.notBefore
      ? `${formatBroadcastStart(refusal.notBefore)} 以降に`
      : '時間をおいてから'

    return `前回の適用から間がないため、いま適用されませんでした。${at}お試しください。`
  }

  return 'ルールの適用がすでに走っているため、この要求は重ねられませんでした。走っている適用がこのルールも読みます。'
}

function bodyOf(draft: RuleDraft) {
  return {
    name: draft.name.trim(),
    query: ruleQueryOf(draft.terms),
    priority: draft.priority,
    enabled: draft.enabled,
    marginBeforeSeconds: draft.marginBeforeSeconds,
    marginAfterSeconds: draft.marginAfterSeconds,
  }
}

function draftBodyOf(draft: RuleDraft, id?: string) {
  return {
    ruleId: id,
    query: ruleQueryOf(draft.terms),
    priority: draft.priority,
    marginBeforeSeconds: draft.marginBeforeSeconds,
    marginAfterSeconds: draft.marginAfterSeconds,
  }
}

function toWrite<T>(
  response: Response,
  read: () => T,
  refusals: Partial<Record<number, string>>,
  fallback: string,
): RuleWrite<T> {
  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  const refusal = refusals[response.status]

  if (refusal !== undefined) {
    return { state: 'rejected', message: refusal }
  }

  if (!response.ok) {
    return { state: 'rejected', message: `${fallback}(${response.status})` }
  }

  return { state: 'ok', data: read() }
}

function toRule(rule: RuleResponder): Rule {
  return {
    id: rule.id,
    name: rule.name,
    terms: ruleTermsOf(rule.query),
    priority: toInt(rule.priority),
    enabled: rule.enabled,
    marginBeforeSeconds: toInt(rule.marginBeforeSeconds),
    marginAfterSeconds: toInt(rule.marginAfterSeconds),
    createdAt: rule.createdAt,
  }
}

function toPreview(
  preview: RulePreviewResponder,
  known: GuideChannel[],
): RulePreview {
  const takes = [...preview.takes].sort(
    (left, right) =>
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  )

  return {
    takes: takes.slice(0, RULE_TAKES_SHOWN).map((take) => toTake(take, known)),
    matched: toInt(preview.matched),
    making: toInt(preview.making),
    alreadyReserved: toInt(preview.alreadyReserved),
    contended: toInt(preview.contended),
    excluded: toInt(preview.excludedAsShadows),
  }
}

function toTake(
  take: RulePreviewTakeResponder,
  known: GuideChannel[],
): RuleTake {
  const key = `${toInt(take.networkId)}-${toInt(take.serviceId)}`
  const channel = known.find((one) => one.id === key)

  return {
    id: take.programme,
    whenLabel: take.endsAt
      ? formatBroadcastSpan(take.startsAt, take.endsAt)
      : `${formatBroadcastStart(take.startsAt)}–${END_UNDECIDED}`,
    channelName: channel?.name || key,
    channelNo: channel?.no,
    title: take.name,
    alreadyReserved: take.alreadyReserved,
    verdict: take.verdict ?? undefined,
  }
}

function toImpact(impact: RuleImpactResponder): RuleImpact {
  return {
    making: toInt(impact.making),
    withdrawing: toInt(impact.withdrawing),
    sweeping: toInt(impact.sweeping),
    changingHands: toInt(impact.changingHands),
    excluded: toInt(impact.excludedAsShadows),
  }
}

function toApplication(run: RuleApplicationResponder): RuleApplication {
  return {
    read: toInt(run.read),
    made: toInt(run.made),
    refused: toInt(run.refused),
    withdrawn: toInt(run.withdrawn),
    turnedOff: toInt(run.turnedOff),
    faulted: toInt(run.faulted),
  }
}
