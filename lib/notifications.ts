import { formatClock, formatMoment, formatRecentMoment } from '@/lib/format'
import {
  NOT_YET_IN_THIS_BUILD,
  shapeFor,
  wordFor,
} from '@/lib/not-yet-in-this-build'

export type WebhookKind = 'slack' | 'discord'

export type DestinationKind = WebhookKind | 'webPush'

export type DeliveryFailure =
  'timeout' | 'rateLimited' | 'rejected' | 'tls' | 'unreachable'

export type DestinationResult =
  | { state: 'sent'; at: string }
  | { state: 'failed' | 'givenUp'; at: string; failure: DeliveryFailure }

/** A place notices are sent to. A webhook's address never comes back from Carina, only its last four characters. */
export interface NotificationDestination {
  id: string
  name: string
  kind: DestinationKind
  urlTail?: string
  enabled: boolean
  lastResult?: DestinationResult
}

export type NotificationEvent =
  | 'recordingStarted'
  | 'recordingCompleted'
  | 'recordingTruncated'
  | 'recordingFailed'
  | 'encodeStarted'
  | 'encodeCompleted'
  | 'encodeFailed'
  | 'reservationCompeting'
  | 'reservationMissed'
  | 'programmeMoved'
  | 'qualityRaised'
  | 'qualityResolved'
  | 'deviceDisconnected'

export interface NotificationRuleSet {
  id: string
  name: string
  enabled: boolean
  events: NotificationEvent[]
  destinationIds: string[]
}

export type RuleSetDraft = Omit<NotificationRuleSet, 'id'>

export type DeliveryState = 'queued' | 'sent' | 'failed' | 'givenUp'

export interface NotificationDelivery {
  id: string
  at: string
  event: NotificationEvent | 'programmeStarting'
  subject: string
  destinationId: string
  destinationName: string
  state: DeliveryState
  failure?: DeliveryFailure
}

export const LEADS = [0, 1, 3, 5, 10] as const

export type LeadMinutes = (typeof LEADS)[number]

export interface NotificationSettings {
  leadMinutes: LeadMinutes
  hasPublicOrigin: boolean
}

/** A notice that a programme is about to start, set from the guide without recording it. */
export interface ProgrammeWatch {
  id: string
  leadMinutes: LeadMinutes
  destinationIds: string[]
}

export type NotificationWrite =
  | { state: 'ok' }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

export type TestSending =
  | { state: 'ok'; delivered: true }
  | { state: 'ok'; delivered: false; failure: DeliveryFailure }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

export type BrowserPermission = 'default' | 'granted' | 'denied'

export const RULE_SETS_AT_MOST = 20

export const KIND_LABEL: Record<DestinationKind, string> = {
  slack: 'Slack',
  discord: 'Discord',
  webPush: 'Web Push',
}

export const FAILURE_LABEL: Record<DeliveryFailure, string> = {
  timeout: '時間切れ',
  rateLimited: '回数の上限',
  rejected: '断られた',
  tls: '暗号化の失敗',
  unreachable: 'つながらない',
}

const SLACK_HOST = 'hooks.slack.com'

const DISCORD_HOSTS = new Set(['discord.com', 'discordapp.com'])

const DISCORD_PATH = '/api/webhooks/'

/** Which service a webhook's address is for, as Carina decides it (BR-NT-001/002); `undefined` for an address it refuses. */
export function webhookKindOf(address: string): WebhookKind | undefined {
  let url: URL

  try {
    url = new URL(address.trim())
  } catch {
    return undefined
  }

  if (
    url.protocol !== 'https:' ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== ''
  ) {
    return undefined
  }

  if (url.hostname === SLACK_HOST) {
    return 'slack'
  }

  return DISCORD_HOSTS.has(url.hostname) &&
    url.pathname.startsWith(DISCORD_PATH)
    ? 'discord'
    : undefined
}

export interface AddressReading {
  kind?: WebhookKind
  refused: boolean
}

/** What an address typed so far says: the service it will be kept as, or that Carina would refuse it. An empty field says neither. */
export function readAddress(address: string): AddressReading {
  if (address.trim() === '') {
    return { refused: false }
  }

  const kind = webhookKindOf(address)

  return { kind, refused: kind === undefined }
}

export function registeringAs(kind: WebhookKind): string {
  return `${KIND_LABEL[kind]} として登録します`
}

export function tailOf(urlTail: string): string {
  return `…${urlTail}`
}

export interface EventGroup {
  name: string
  prefix: string
  events: { event: NotificationEvent; label: string }[]
}

/** The events a rule set chooses from, grouped as the editor lays them out. A group's prefix is what its labels are read after in a summary. */
export const EVENT_GROUPS: EventGroup[] = [
  {
    name: '録画',
    prefix: '録画の',
    events: [
      { event: 'recordingStarted', label: '開始' },
      { event: 'recordingCompleted', label: '完了' },
      { event: 'recordingTruncated', label: '欠け' },
      { event: 'recordingFailed', label: '失敗' },
    ],
  },
  {
    name: 'エンコード',
    prefix: 'エンコードの',
    events: [
      { event: 'encodeStarted', label: '開始' },
      { event: 'encodeCompleted', label: '完了' },
      { event: 'encodeFailed', label: '失敗' },
    ],
  },
  {
    name: '予約',
    prefix: '',
    events: [
      { event: 'reservationCompeting', label: '競合' },
      { event: 'reservationMissed', label: '取り逃し' },
      { event: 'programmeMoved', label: '番組の移動' },
    ],
  },
  {
    name: '品質',
    prefix: '',
    events: [
      { event: 'qualityRaised', label: '異常の発生' },
      { event: 'qualityResolved', label: '解消' },
    ],
  },
  {
    name: '機器',
    prefix: '',
    events: [{ event: 'deviceDisconnected', label: '切断' }],
  },
]

export const NO_EVENTS = 'なし'

/** A rule set's events in words: each group's chosen labels joined after its prefix, the groups parted by a dot. */
export function eventsSummary(events: readonly NotificationEvent[]): string {
  const chosen = new Set(events)
  const said = EVENT_GROUPS.flatMap((group) => {
    const labels = group.events
      .filter(({ event }) => chosen.has(event))
      .map(({ label }) => label)

    return labels.length === 0 ? [] : [`${group.prefix}${labels.join('・')}`]
  })

  return said.length === 0 ? NO_EVENTS : said.join(' · ')
}

export const EVENT_LABEL: Record<NotificationDelivery['event'], string> = {
  recordingStarted: '録画の開始',
  recordingCompleted: '録画の完了',
  recordingTruncated: '録画の欠け',
  recordingFailed: '録画の失敗',
  encodeStarted: 'エンコードの開始',
  encodeCompleted: 'エンコードの完了',
  encodeFailed: 'エンコードの失敗',
  reservationCompeting: '予約の競合',
  reservationMissed: '予約の取り逃し',
  programmeMoved: '番組の移動',
  qualityRaised: '品質の異常の発生',
  qualityResolved: '品質の異常の解消',
  deviceDisconnected: '機器の切断',
  programmeStarting: '放送開始の通知',
}

export function eventLabelOf(event: NotificationDelivery['event']): string {
  return wordFor(EVENT_LABEL, event)
}

export function leadLabel(lead: LeadMinutes): string {
  return lead === 0 ? '開始時' : `${lead} 分前`
}

/** The words on the chip a programme wears once its start is to be told. */
export function leadChipWords(lead: LeadMinutes): string {
  return lead === 0 ? '開始時に通知' : `開始 ${lead} 分前に通知`
}

/** What the toast says once a programme's start is to be told. */
export function leadToastWords(lead: LeadMinutes): string {
  return lead === 0 ? '開始時に通知します' : `開始の ${lead} 分前に通知します`
}

export function isLead(value: number): value is LeadMinutes {
  return (LEADS as readonly number[]).includes(value)
}

export type Verdict = 'ok' | 'warn' | 'err' | 'calm'

export interface Said {
  verdict: Verdict
  words: string
  why?: string
}

function failureWord(failure: DeliveryFailure | undefined): string | undefined {
  return failure === undefined ? undefined : wordFor(FAILURE_LABEL, failure)
}

/** How the last notice sent to a destination went: reached it, still being tried, or given up on. */
export function lastResultSaid(
  result: DestinationResult,
  now: number = Date.now(),
): Said {
  if (result.state === 'sent') {
    return {
      verdict: 'ok',
      words: `届いた ${formatRecentMoment(result.at, now)}`,
    }
  }

  return {
    verdict: result.state === 'failed' ? 'warn' : 'err',
    words: result.state === 'failed' ? '届いていない' : '届かなかった',
    why: failureWord(result.failure),
  }
}

const DELIVERY_SAID: Record<DeliveryState, Said> = {
  queued: { verdict: 'calm', words: '送信待ち' },
  sent: { verdict: 'ok', words: '届いた' },
  failed: { verdict: 'warn', words: '送り直し中' },
  givenUp: { verdict: 'err', words: '届かなかった' },
}

const UNKNOWN_STATE: Said = { verdict: 'calm', words: NOT_YET_IN_THIS_BUILD }

/** One delivery's state as its chip says it, with the reason when it has not reached its destination. */
export function deliverySaid(delivery: NotificationDelivery): Said {
  const said = shapeFor(DELIVERY_SAID, delivery.state, UNKNOWN_STATE)

  return said.verdict === 'warn' || said.verdict === 'err'
    ? { ...said, why: failureWord(delivery.failure) }
    : said
}

/** The answer to a test send, beside the button that asked for it. */
export function testSaid(sending: Extract<TestSending, { state: 'ok' }>): Said {
  return sending.delivered
    ? { verdict: 'ok', words: '届いた' }
    : {
        verdict: 'err',
        words: '届かなかった',
        why: failureWord(sending.failure),
      }
}

export function withWhy(said: Said): string {
  return said.why === undefined ? said.words : `${said.words} · ${said.why}`
}

export function deliveryMoment(at: string, now: number = Date.now()): string {
  return formatMoment(at, now)
}

export function deliveryClock(at: string): string {
  return formatClock(new Date(at).getTime())
}

export function ruleSetsFull(count: number): boolean {
  return count >= RULE_SETS_AT_MOST
}

export const NAME_LONGEST = 64

/** Whether a destination or rule set name can be kept: one to 64 characters once trimmed. */
export function nameFits(name: string): boolean {
  const trimmed = name.trim()

  return trimmed.length > 0 && [...trimmed].length <= NAME_LONGEST
}

/** The destinations a new single notice goes to when nobody chose: every one that is on. */
export function destinationsByDefault(
  destinations: readonly Pick<NotificationDestination, 'id' | 'enabled'>[],
): string[] {
  return destinations.filter(({ enabled }) => enabled).map(({ id }) => id)
}

export function toggled<T>(chosen: readonly T[], one: T): T[] {
  return chosen.includes(one)
    ? chosen.filter((each) => each !== one)
    : [...chosen, one]
}
