import { formatClock, formatMoment, formatRecentMoment } from '@/lib/format'
import {
  NOT_YET_IN_THIS_BUILD,
  shapeFor,
  wordFor,
} from '@/lib/not-yet-in-this-build'

export type WebhookKind = 'slack' | 'discord'

export type DestinationKind = WebhookKind | 'webPush'

/** The kinds as Carina names them: a browser is `push` there. */
export type CarinaDestinationKind = WebhookKind | 'push'

export type DeliveryFailure =
  | 'timedOut'
  | 'rateLimited'
  | 'serverFailed'
  | 'unreachable'
  | 'rejected'
  | 'destinationDisabled'
  | 'unreadable'
  | 'tooOld'
  | 'tlsFailed'

/** A place notices are sent to. A webhook's address never comes back from Carina, only its last four characters. */
export interface NotificationDestination {
  id: string
  name: string
  kind: DestinationKind
  tail?: string
  /** For a browser, the SHA-256 of the address its subscription is sent to, by which a browser finds its own row. */
  fingerprint?: string
  enabled: boolean
  /** Whether Carina can still open the address it keeps sealed. */
  readable: boolean
  lastResultAt?: string
  lastFailure?: DeliveryFailure
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
  | 'qualityIncidentDetected'
  | 'qualityIncidentResolved'
  | 'deviceDisconnected'

/** What a notice can be of: an event a rule set chooses, or what a single notice tells, which no rule set does. */
export type NoticeKind =
  | NotificationEvent
  | 'programmeStarting'
  | 'watchedProgrammeMoved'
  | 'watchedProgrammeGone'

export interface NotificationRuleSet {
  id: string
  name: string
  enabled: boolean
  events: NotificationEvent[]
  destinations: string[]
}

export type RuleSetDraft = Omit<NotificationRuleSet, 'id'>

export interface WebhookDraft {
  name: string
  url: string
}

/** What changing a destination sends: its name, whether it is on, and a new address only when one was typed. */
export interface DestinationRevision {
  name: string
  enabled: boolean
  url?: string
}

export type DeliveryState = 'queued' | 'sent' | 'failed' | 'givenUp'

/** One notice on its way to one destination. Its title is the heading Carina gave the notice. */
export interface NotificationDelivery {
  id: string
  kind: NoticeKind
  occurredAt: string
  destinationId: string
  state: DeliveryState
  failure?: DeliveryFailure
}

export const LEADS = [0, 1, 3, 5, 10] as const

export type LeadMinutes = (typeof LEADS)[number]

export interface NotificationSettings {
  notifyLeadMinutes: LeadMinutes
  publicOriginKnown: boolean
}

export interface NotificationsScreen {
  settings: NotificationSettings
  destinations: NotificationDestination[]
  ruleSets: NotificationRuleSet[]
  /** What went to every destination lately, the newest first. */
  deliveries: NotificationDelivery[]
}

/** A notice that a programme is about to start, set from the guide without recording it. */
export interface ProgrammeWatch {
  id: string
  leadMinutes: LeadMinutes
}

/** A single notice still waiting for its programme, as the list of reservations shows it. */
export interface WatchedProgramme extends ProgrammeWatch {
  title: string
  channelName: string
  startAt: string
  endAt: string
  destinationNames: string[]
}

/** What a new single notice is asked with. */
export interface WatchDraft {
  leadMinutes: LeadMinutes
  destinations: string[]
}

/** What a new single notice starts from: the lead the settings hold and the destinations that are on. */
export interface WatchOffer {
  leadMinutes: LeadMinutes
  destinations: Pick<NotificationDestination, 'id' | 'name'>[]
}

/** A write that was not done: Carina refused it, or it never reached Carina. */
export interface WriteRefusal {
  state: 'rejected'
  message: string
  unreached?: true
  /** What was written to is no longer there, so its row leaves the page. */
  gone?: true
}

export type NotificationWrite =
  { state: 'ok' } | { state: 'unauthenticated' } | WriteRefusal

export type WatchWrite =
  | { state: 'ok'; watch: ProgrammeWatch }
  | { state: 'unauthenticated' }
  | WriteRefusal

/** Whether Carina answered the write, so what the pages show may have changed. */
export function wasAnswered(
  result: NotificationWrite | WatchWrite | TestSending,
): boolean {
  return !(result.state === 'rejected' && result.unreached === true)
}

/** The refusal of a write to what is no longer there, to be said where it outlives the row; nothing for any other answer. */
export function saidOfTheGone(result: NotificationWrite): string | undefined {
  return result.state === 'rejected' && result.gone ? result.message : undefined
}

/** One place in a list single notices stand among: what the list held, or a notice. */
export type AmongWatches<T> =
  { own: T; watch?: undefined } | { own?: undefined; watch: WatchedProgramme }

/** The list with each notice put before the first of its entries that starts later. */
export function amongWatches<T>(
  own: readonly T[],
  startOf: (one: T) => string | undefined,
  watches: readonly WatchedProgramme[],
): AmongWatches<T>[] {
  const waiting = [...watches].sort(
    (left, right) => Date.parse(left.startAt) - Date.parse(right.startAt),
  )
  const among: AmongWatches<T>[] = []
  let next = 0

  for (const one of own) {
    const start = startOf(one)

    while (
      start !== undefined &&
      next < waiting.length &&
      Date.parse(waiting[next].startAt) < Date.parse(start)
    ) {
      among.push({ watch: waiting[next] })
      next += 1
    }

    among.push({ own: one })
  }

  return [...among, ...waiting.slice(next).map((watch) => ({ watch }))]
}

/** The single notices a list of reservations shows among its rows, and what takes one back. */
export interface WaitingNotices {
  watches: WatchedProgramme[]
  onCancel: (id: string) => Promise<NotificationWrite>
}

/** What a programme's detail asks and takes back a single notice with; without an offer there is nowhere to send one. */
export interface Noticing {
  offer?: WatchOffer
  onWatch: (programmeId: string, draft: WatchDraft) => Promise<WatchWrite>
  onUnwatch: (watchId: string) => Promise<NotificationWrite>
}

export type TestSending =
  | { state: 'ok'; delivered: boolean; failure?: DeliveryFailure }
  | { state: 'unauthenticated' }
  | WriteRefusal

export type BrowserPermission = 'default' | 'granted' | 'denied'

export const RULE_SETS_AT_MOST = 20

export const KIND_LABEL: Record<DestinationKind, string> = {
  slack: 'Slack',
  discord: 'Discord',
  webPush: 'Web Push',
}

const KIND_OF: Record<CarinaDestinationKind, DestinationKind> = {
  slack: 'slack',
  discord: 'discord',
  push: 'webPush',
}

/** The screen's kind for Carina's. A kind this build does not know yet passes as it is, and the chip calls it unknown. */
export function destinationKindOf(
  kind: CarinaDestinationKind,
): DestinationKind {
  return shapeFor(KIND_OF, kind, kind as DestinationKind)
}

export const FAILURE_LABEL: Record<DeliveryFailure, string> = {
  timedOut: '時間切れ',
  rateLimited: '回数の上限',
  serverFailed: '送り先の障害',
  unreachable: 'つながらない',
  rejected: '断られた',
  destinationDisabled: '送り先が無効',
  unreadable: '開けない',
  tooOld: '古くなった',
  tlsFailed: '暗号化の失敗',
}

const WORTH_ANOTHER_TRY: ReadonlySet<DeliveryFailure> = new Set([
  'timedOut',
  'rateLimited',
  'serverFailed',
  'unreachable',
  'tlsFailed',
])

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

export function tailOf(tail: string): string {
  return `…${tail}`
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
      { event: 'qualityIncidentDetected', label: '異常の発生' },
      { event: 'qualityIncidentResolved', label: '解消' },
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

export const EVENT_LABEL: Record<NoticeKind, string> = {
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
  qualityIncidentDetected: '品質の異常の発生',
  qualityIncidentResolved: '品質の異常の解消',
  deviceDisconnected: '機器の切断',
  programmeStarting: '放送開始',
  watchedProgrammeMoved: '放送時刻の変更',
  watchedProgrammeGone: '放送の取り消し',
}

export function eventLabelOf(event: NoticeKind): string {
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

/** The line under a single notice's title in the list of reservations. */
export function watchLine(
  watch: Pick<
    WatchedProgramme,
    'channelName' | 'leadMinutes' | 'destinationNames'
  >,
): string {
  return [
    watch.channelName,
    leadLabel(watch.leadMinutes),
    watch.destinationNames.join('・'),
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Whether a programme is still ahead: by the clock on the day shown, by the date on any other. */
export function yetToStart(
  program: { startMin: number },
  nowMin: number | undefined,
  day: string,
  today: string | undefined,
): boolean {
  if (nowMin !== undefined) {
    return program.startMin > nowMin
  }

  return today !== undefined && day > today
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

export function failureWord(
  failure: DeliveryFailure | undefined,
): string | undefined {
  return failure === undefined ? undefined : wordFor(FAILURE_LABEL, failure)
}

/** How the last notice sent to a destination went: reached it, not yet there, or never will be. Nothing while none was sent. */
export function lastResultSaid(
  destination: Pick<
    NotificationDestination,
    'readable' | 'lastResultAt' | 'lastFailure'
  >,
  now: number = Date.now(),
): Said | undefined {
  const { readable, lastResultAt, lastFailure } = destination

  if (!readable) {
    return { verdict: 'err', words: FAILURE_LABEL.unreadable }
  }

  if (lastResultAt === undefined) {
    return undefined
  }

  if (lastFailure === undefined) {
    return {
      verdict: 'ok',
      words: `届いた ${formatRecentMoment(lastResultAt, now)}`,
    }
  }

  const retried = WORTH_ANOTHER_TRY.has(lastFailure)

  return {
    verdict: retried ? 'warn' : 'err',
    words: retried ? '届いていない' : '届かなかった',
    why: failureWord(lastFailure),
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

/** The rule sets that go when a destination does: the ones that send to it alone. */
export function ruleSetsGoingWith<
  T extends Pick<NotificationRuleSet, 'destinations'>,
>(destinationId: string, ruleSets: readonly T[]): T[] {
  return ruleSets.filter(
    ({ destinations }) =>
      destinations.length > 0 &&
      destinations.every((one) => one === destinationId),
  )
}

/** What removing a destination says about the rule sets that go with it; nothing when none does. */
export function goingToo(names: readonly string[]): string | undefined {
  return names.length === 0
    ? undefined
    : `ルールセット${names.map((name) => `「${name}」`).join('')}も削除します。`
}

export const DELIVERIES_SHOWN = 50

/** The deliveries of several destinations as one log, the newest first. */
export function newestFirst(
  deliveries: readonly NotificationDelivery[],
): NotificationDelivery[] {
  return [...deliveries].sort(
    (one, other) => Date.parse(other.occurredAt) - Date.parse(one.occurredAt),
  )
}

/** The destination the log is narrowed to: the one chosen while it is still held, otherwise none. */
export function narrowedTo(
  destinations: readonly Pick<NotificationDestination, 'id'>[],
  chosen: string | undefined,
): string | undefined {
  return destinations.some(({ id }) => id === chosen) ? chosen : undefined
}

/** The rows the log lists: the newest fifty of every destination, or of the one it is narrowed to. */
export function deliveriesShown(
  deliveries: readonly NotificationDelivery[],
  destinationId: string | undefined,
): NotificationDelivery[] {
  const asked =
    destinationId === undefined
      ? deliveries
      : deliveries.filter((one) => one.destinationId === destinationId)

  return asked.slice(0, DELIVERIES_SHOWN)
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
