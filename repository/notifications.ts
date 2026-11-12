import {
  DELIVERIES_SHOWN,
  NAME_LONGEST,
  RULE_SETS_AT_MOST,
  destinationKindOf,
  isLead,
  newestFirst,
} from '@/lib/notifications'
import type {
  DestinationRevision,
  LeadMinutes,
  NotificationDelivery,
  NotificationDestination,
  NotificationRuleSet,
  NotificationSettings,
  NotificationWrite,
  NotificationsScreen,
  ProgrammeWatch,
  RuleSetDraft,
  TestSending,
  WatchDraft,
  WatchOffer,
  WatchWrite,
  WatchedProgramme,
  WebhookDraft,
  WriteRefusal,
} from '@/lib/notifications'
import { couldNot } from '@/lib/try-again'
import {
  NO_PUBLIC_ORIGIN_HERE,
  type BrowserRow,
  type BrowserWrite,
  type PushKeyAnswer,
  type PushSubscriptionDraft,
} from '@/lib/web-push'
import { unstable_rethrow } from 'next/navigation'

import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import { fetchProgramme, toInt } from '@/repository/programmes'
import { whatItSaid } from '@/repository/said'

type DestinationResponder =
  components['schemas']['NotificationDestinationResponder']
type RuleResponder = components['schemas']['NotificationRuleResponder']
type DeliveryResponder = components['schemas']['NotificationDeliveryResponder']
type SettingsResponder = components['schemas']['NotificationSettingsResponder']
type WatchResponder = components['schemas']['NotificationWatchResponder']

export interface NotificationAsking {
  did: string
  fell: string
}

export const WHEN_ADDING_A_DESTINATION: NotificationAsking = {
  did: '追加',
  fell: '送り先を追加できませんでした',
}

export const WHEN_CHANGING_A_DESTINATION: NotificationAsking = {
  did: '変更',
  fell: '送り先を変更できませんでした',
}

export const WHEN_REMOVING_A_DESTINATION: NotificationAsking = {
  did: '削除',
  fell: '送り先を削除できませんでした',
}

export const WHEN_TRYING_A_DESTINATION: NotificationAsking = {
  did: 'テスト送信',
  fell: 'テスト送信ができませんでした',
}

export const WHEN_ADDING_A_RULE_SET: NotificationAsking = {
  did: '追加',
  fell: 'ルールセットを追加できませんでした',
}

export const WHEN_CHANGING_A_RULE_SET: NotificationAsking = {
  did: '変更',
  fell: 'ルールセットを変更できませんでした',
}

export const WHEN_REMOVING_A_RULE_SET: NotificationAsking = {
  did: '削除',
  fell: 'ルールセットを削除できませんでした',
}

export const WHEN_SETTLING_THE_LEAD: NotificationAsking = {
  did: '変更',
  fell: '単発の通知の既定を変更できませんでした',
}

const UNREADABLE = '通知の設定を読めませんでした'

const BROWSER_REFUSED: Partial<Record<number, string>> = {
  400: 'このブラウザには送れないため、追加できませんでした。',
  409: NO_PUBLIC_ORIGIN_HERE,
}

const NOT_WATCHED = '通知を設定できませんでした'

const NOT_IN_THE_GUIDE =
  'この番組は番組表にもうないため、通知を設定できませんでした。番組表を読み直してください。'

const WATCH_REFUSED: Partial<Record<number, string>> = {
  400: '選んだ送り先が使えなくなったため、通知を設定できませんでした。画面を読み直してください。',
  404: NOT_IN_THE_GUIDE,
}

const ALREADY_STARTED =
  'この番組はもう始まっているため、通知を設定できませんでした。'

const ALREADY_WATCHED =
  'この番組の通知はすでに設定してあるか、もう送ったため、設定できませんでした。'

const UNWATCH_REFUSED: Partial<Record<number, string>> = {
  404: 'この通知は残っていないため、取り消せませんでした。',
  409: 'この通知はもう済んでいるため、取り消せませんでした。',
}

const NOT_UNWATCHED = '通知を取り消せませんでした'

const REFUSAL_SAYINGS: [RegExp, string][] = [
  [/not one a notice can be sent to/i, 'この URL は受け付けられません。'],
  [
    /a trial was sent a moment ago/i,
    '続けてテスト送信はできません。1 分ほどおいてからお試しください。',
  ],
  [
    /cannot be opened with the keys/i,
    'この送り先の URL を開けません。URL を入れ直してください。',
  ],
]

const REFUSAL_REASONS: [RegExp, string][] = [
  [
    /no destination is (registered|held) under/i,
    'この送り先は残っていないため、',
  ],
  [/no set of rules is held under/i, 'このルールセットは残っていないため、'],
  [
    /at most \d+ sets of rules are held/i,
    `ルールセットは ${RULE_SETS_AT_MOST} 本までのため、`,
  ],
  [/sends to at least one destination/i, '選んだ送り先が残っていないため、'],
  [
    /is named in one to sixty-four characters/i,
    `名前が 1 〜 ${NAME_LONGEST} 文字でないため、`,
  ],
]

export function whyItRefused(
  asking: NotificationAsking,
  said: string | undefined,
): string {
  const heard = said ?? ''
  const saying = REFUSAL_SAYINGS.find(([reads]) => reads.test(heard))

  if (saying) {
    return saying[1]
  }

  const reason = REFUSAL_REASONS.find(([reads]) => reads.test(heard))

  return reason
    ? `${reason[1]}${asking.did}できませんでした。`
    : couldNot(asking.fell)
}

export async function getNotificationsScreen(): Promise<NotificationsScreen> {
  const [destinations, ruleSets, settings] = await Promise.all([
    fetchDestinations(),
    fetchRuleSets(),
    fetchSettings(),
  ])
  const sentTo = await Promise.all(
    destinations.map(({ id }) => fetchDeliveries(id)),
  )

  return {
    settings,
    destinations,
    ruleSets,
    deliveries: newestFirst(sentTo.flat()),
  }
}

export async function registerDestination(
  draft: WebhookDraft,
): Promise<NotificationWrite> {
  return reaching(
    WHEN_ADDING_A_DESTINATION.fell,
    async (): Promise<NotificationWrite> => {
      const { error, response } = await carinaClient().POST(
        '/api/notifications/destinations',
        { body: { name: draft.name, url: draft.url } },
      )

      return toWrite(response, whatItSaid(error), WHEN_ADDING_A_DESTINATION)
    },
  )
}

export async function reviseDestination(
  id: string,
  change: DestinationRevision,
): Promise<NotificationWrite> {
  return reaching(
    WHEN_CHANGING_A_DESTINATION.fell,
    async (): Promise<NotificationWrite> => {
      const { error, response } = await carinaClient().PATCH(
        '/api/notifications/destinations/{id}',
        {
          params: { path: { id } },
          body: {
            name: change.name,
            enabled: change.enabled,
            url: change.url ?? '',
          },
        },
      )

      return toWrite(response, whatItSaid(error), WHEN_CHANGING_A_DESTINATION)
    },
  )
}

export async function switchDestination(
  id: string,
  enabled: boolean,
): Promise<NotificationWrite> {
  return reaching(
    WHEN_CHANGING_A_DESTINATION.fell,
    async (): Promise<NotificationWrite> => {
      const { error, response } = await carinaClient().PATCH(
        '/api/notifications/destinations/{id}',
        { params: { path: { id } }, body: { enabled } },
      )

      return toWrite(response, whatItSaid(error), WHEN_CHANGING_A_DESTINATION)
    },
  )
}

export async function removeDestination(
  id: string,
): Promise<NotificationWrite> {
  return reaching(
    WHEN_REMOVING_A_DESTINATION.fell,
    async (): Promise<NotificationWrite> => {
      const { error, response } = await carinaClient().DELETE(
        '/api/notifications/destinations/{id}',
        { params: { path: { id } } },
      )

      return toWrite(response, whatItSaid(error), WHEN_REMOVING_A_DESTINATION)
    },
  )
}

export async function tryDestination(id: string): Promise<TestSending> {
  return reaching(
    WHEN_TRYING_A_DESTINATION.fell,
    async (): Promise<TestSending> => {
      const { data, error, response } = await carinaClient().POST(
        '/api/notifications/destinations/{id}/test',
        { params: { path: { id } } },
      )
      const written = toWrite(
        response,
        whatItSaid(error, data),
        WHEN_TRYING_A_DESTINATION,
      )

      if (written.state !== 'ok') {
        return written
      }

      const trial = data?.data

      return trial
        ? {
            state: 'ok',
            delivered: trial.delivered,
            failure: trial.failure ?? undefined,
          }
        : {
            state: 'rejected',
            message: couldNot(WHEN_TRYING_A_DESTINATION.fell),
          }
    },
  )
}

export async function defineRuleSet(
  draft: RuleSetDraft,
): Promise<NotificationWrite> {
  return reaching(
    WHEN_ADDING_A_RULE_SET.fell,
    async (): Promise<NotificationWrite> => {
      const { error, response } = await carinaClient().POST(
        '/api/notifications/rules',
        { body: toRuleBody(draft) },
      )

      return toWrite(response, whatItSaid(error), WHEN_ADDING_A_RULE_SET)
    },
  )
}

export async function reviseRuleSet(
  id: string,
  draft: RuleSetDraft,
): Promise<NotificationWrite> {
  return reaching(
    WHEN_CHANGING_A_RULE_SET.fell,
    async (): Promise<NotificationWrite> => {
      const { error, response } = await carinaClient().PATCH(
        '/api/notifications/rules/{id}',
        { params: { path: { id } }, body: toRuleBody(draft) },
      )

      return toWrite(response, whatItSaid(error), WHEN_CHANGING_A_RULE_SET)
    },
  )
}

export async function switchRuleSet(
  id: string,
  enabled: boolean,
): Promise<NotificationWrite> {
  return reaching(
    WHEN_CHANGING_A_RULE_SET.fell,
    async (): Promise<NotificationWrite> => {
      const { error, response } = await carinaClient().PATCH(
        '/api/notifications/rules/{id}',
        { params: { path: { id } }, body: { enabled } },
      )

      return toWrite(response, whatItSaid(error), WHEN_CHANGING_A_RULE_SET)
    },
  )
}

export async function removeRuleSet(id: string): Promise<NotificationWrite> {
  return reaching(
    WHEN_REMOVING_A_RULE_SET.fell,
    async (): Promise<NotificationWrite> => {
      const { error, response } = await carinaClient().DELETE(
        '/api/notifications/rules/{id}',
        { params: { path: { id } } },
      )

      return toWrite(response, whatItSaid(error), WHEN_REMOVING_A_RULE_SET)
    },
  )
}

export async function settleLead(
  lead: LeadMinutes,
): Promise<NotificationWrite> {
  return reaching(
    WHEN_SETTLING_THE_LEAD.fell,
    async (): Promise<NotificationWrite> => {
      const { error, response } = await carinaClient().PUT(
        '/api/notifications/settings',
        { body: { notifyLeadMinutes: lead } },
      )

      return toWrite(response, whatItSaid(error), WHEN_SETTLING_THE_LEAD)
    },
  )
}

/** The key a browser subscribes under, which Carina gives only while it knows its public address. */
export async function readPushKey(): Promise<PushKeyAnswer> {
  return reaching(
    WHEN_ADDING_A_DESTINATION.fell,
    async (): Promise<PushKeyAnswer> => {
      const { data, response } = await carinaClient().GET(
        '/api/notifications/push/key',
      )

      if (response.status === 401) {
        return { state: 'unauthenticated' }
      }

      const key = data?.data?.publicKey

      if (response.ok && key) {
        return { state: 'ok', publicKey: key }
      }

      return {
        state: 'rejected',
        message:
          response.status === 409
            ? NO_PUBLIC_ORIGIN_HERE
            : couldNot(WHEN_ADDING_A_DESTINATION.fell),
      }
    },
  )
}

/** Adds a browser by its subscription. A browser already held is answered with its row, as one added. */
export async function registerBrowser(
  draft: PushSubscriptionDraft & { name: string },
): Promise<BrowserWrite> {
  return reaching(
    WHEN_ADDING_A_DESTINATION.fell,
    async (): Promise<BrowserWrite> => {
      const { data, error, response } = await carinaClient().POST(
        '/api/notifications/push/subscriptions',
        {
          body: {
            name: draft.name,
            endpoint: draft.endpoint,
            keys: draft.keys,
          },
        },
      )

      return toBrowserWrite(
        response,
        data?.data?.id,
        whatItSaid(error),
        WHEN_ADDING_A_DESTINATION,
      )
    },
  )
}

/** Puts the subscription a browser made anew to its row, which the rule sets keep pointing at. */
export async function replaceBrowserSubscription(
  destinationId: string,
  draft: PushSubscriptionDraft,
): Promise<BrowserWrite> {
  return reaching(
    WHEN_CHANGING_A_DESTINATION.fell,
    async (): Promise<BrowserWrite> => {
      const { data, error, response } = await carinaClient().PUT(
        '/api/notifications/push/subscriptions/{destinationId}',
        {
          params: { path: { destinationId } },
          body: { endpoint: draft.endpoint, keys: draft.keys },
        },
      )

      return toBrowserWrite(
        response,
        data?.data?.id,
        whatItSaid(error),
        WHEN_CHANGING_A_DESTINATION,
      )
    },
  )
}

/** The browser rows, by which a browser finds whether its own is still there. */
export async function listBrowserRows(): Promise<BrowserRow[]> {
  const destinations = await fetchDestinations()

  return destinations
    .filter(({ kind }) => kind === 'webPush')
    .map(({ id, fingerprint }) => ({ id, fingerprint }))
}

/** The single notices still waiting, by the programme each is for. */
export async function listWatches(): Promise<Map<string, ProgrammeWatch>> {
  const waiting = await fetchWaitingWatches()

  return new Map(waiting.map((one) => [one.programmeId, toWatch(one)]))
}

/** What a new single notice starts from; nothing while no destination is on. */
export async function getWatchOffer(): Promise<WatchOffer | undefined> {
  const [destinations, settings] = await Promise.all([
    fetchDestinations(),
    fetchSettings(),
  ])
  const on = destinations.filter(({ enabled }) => enabled)

  return on.length > 0
    ? {
        leadMinutes: settings.notifyLeadMinutes,
        destinations: on.map(({ id, name }) => ({ id, name })),
      }
    : undefined
}

/** The single notices as a programme's detail needs them, each still on its way. */
export interface SingleNotices {
  watches: Promise<Map<string, ProgrammeWatch>>
  offer: Promise<WatchOffer | undefined>
}

/** The notices waiting and what a new one starts from. While those waiting cannot be read none is marked and no new one is offered, since one may already be set. */
export function readSingleNotices(): SingleNotices {
  const waiting: Promise<Map<string, ProgrammeWatch> | undefined> =
    listWatches().catch(() => undefined)
  const offered: Promise<WatchOffer | undefined> = getWatchOffer().catch(
    () => undefined,
  )

  return {
    watches: waiting.then((watches) => watches ?? new Map()),
    offer: Promise.all([waiting, offered]).then(([watches, offer]) =>
      watches ? offer : undefined,
    ),
  }
}

export async function listWatchedProgrammes(): Promise<WatchedProgramme[]> {
  const [waiting, destinations] = await Promise.all([
    fetchWaitingWatches(),
    fetchDestinations(),
  ])
  const names = new Map(destinations.map(({ id, name }) => [id, name]))

  return waiting.map((one) => ({
    ...toWatch(one),
    title: one.programmeName,
    channelName: one.stationName ?? '',
    startAt: one.startsAt,
    endAt: one.endsAt,
    destinationNames: one.destinations
      .map((id) => names.get(id))
      .filter((name) => name !== undefined),
  }))
}

export async function askForWatch(
  programmeId: string,
  draft: WatchDraft,
  now: number = Date.now(),
): Promise<WatchWrite> {
  return reaching(NOT_WATCHED, async (): Promise<WatchWrite> => {
    const programme = await fetchProgramme(programmeId)

    if (!programme) {
      return { state: 'rejected', message: NOT_IN_THE_GUIDE }
    }

    const { data, response } = await carinaClient().POST(
      '/api/notifications/watches',
      {
        body: {
          programme: programmeId,
          programmeStartsAt: programme.startsAt,
          leadMinutes: draft.leadMinutes,
          destinations: draft.destinations,
        },
      },
    )

    if (response.status === 401) {
      return { state: 'unauthenticated' }
    }

    if (response.status === 409) {
      return {
        state: 'rejected',
        message:
          Date.parse(programme.startsAt) <= now
            ? ALREADY_STARTED
            : ALREADY_WATCHED,
      }
    }

    const made = data?.data

    return response.ok && made
      ? { state: 'ok', watch: toWatch(made) }
      : {
          state: 'rejected',
          message: WATCH_REFUSED[response.status] ?? couldNot(NOT_WATCHED),
        }
  })
}

export async function cancelWatch(id: string): Promise<NotificationWrite> {
  return reaching(NOT_UNWATCHED, async (): Promise<NotificationWrite> => {
    const { response } = await carinaClient().DELETE(
      '/api/notifications/watches/{id}',
      { params: { path: { id } } },
    )

    if (response.status === 401) {
      return { state: 'unauthenticated' }
    }

    return response.ok
      ? { state: 'ok' }
      : {
          state: 'rejected',
          message: UNWATCH_REFUSED[response.status] ?? couldNot(NOT_UNWATCHED),
        }
  })
}

/** What a write answers; one that never reached Carina is refused as what could not be done, never thrown. */
async function reaching<T>(
  fell: string,
  write: () => Promise<T>,
): Promise<T | WriteRefusal> {
  try {
    return await write()
  } catch (error) {
    unstable_rethrow(error)

    return { state: 'rejected', message: couldNot(fell), unreached: true }
  }
}

function toRuleBody(draft: RuleSetDraft) {
  return {
    name: draft.name,
    enabled: draft.enabled,
    events: draft.events,
    destinations: draft.destinations,
  }
}

function toBrowserWrite(
  response: Response,
  id: string | undefined,
  said: string | undefined,
  asking: NotificationAsking,
): BrowserWrite {
  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  if (response.ok) {
    return id
      ? { state: 'ok', id }
      : { state: 'rejected', message: couldNot(asking.fell) }
  }

  if (response.status === 404) {
    return {
      state: 'rejected',
      message: whyItRefused(asking, said),
      gone: true,
    }
  }

  return {
    state: 'rejected',
    message: BROWSER_REFUSED[response.status] ?? whyItRefused(asking, said),
  }
}

function toWrite(
  response: Response,
  said: string | undefined,
  asking: NotificationAsking,
): NotificationWrite {
  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  if (response.ok) {
    return { state: 'ok' }
  }

  return {
    state: 'rejected',
    message: whyItRefused(asking, said),
    ...(response.status === 404 ? { gone: true as const } : {}),
  }
}

async function fetchDestinations(): Promise<NotificationDestination[]> {
  const { data, error } = await carinaClient().GET(
    '/api/notifications/destinations',
  )

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
  }

  return data.data.items.map(toDestination)
}

async function fetchWaitingWatches(): Promise<WatchResponder[]> {
  const { data, error } = await carinaClient().GET('/api/notifications/watches')

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
  }

  return data.data.items.filter(({ state }) => state === 'waiting')
}

async function fetchRuleSets(): Promise<NotificationRuleSet[]> {
  const { data, error } = await carinaClient().GET('/api/notifications/rules')

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
  }

  return data.data.items.map(toRuleSet)
}

async function fetchSettings(): Promise<NotificationSettings> {
  const { data, error } = await carinaClient().GET(
    '/api/notifications/settings',
  )

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
  }

  return toSettings(data.data)
}

async function fetchDeliveries(
  destinationId: string,
): Promise<NotificationDelivery[]> {
  const { data, error } = await carinaClient().GET(
    '/api/notifications/deliveries',
    { params: { query: { destinationId, perPage: DELIVERIES_SHOWN } } },
  )

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || UNREADABLE)
  }

  return data.data.items
    .map(toDelivery)
    .map((one) => ({ ...one, destinationId }))
}

function toDestination(one: DestinationResponder): NotificationDestination {
  return {
    id: one.id,
    name: one.name,
    kind: destinationKindOf(one.kind),
    tail: one.kind === 'push' ? undefined : one.tail,
    fingerprint: one.fingerprint ?? undefined,
    enabled: one.enabled,
    readable: one.readable,
    lastResultAt: one.lastResultAt ?? undefined,
    lastFailure: one.lastFailure ?? undefined,
  }
}

function toRuleSet(one: RuleResponder): NotificationRuleSet {
  return {
    id: one.id,
    name: one.name,
    enabled: one.enabled,
    events: one.events,
    destinations: one.destinations,
  }
}

function toDelivery(
  one: DeliveryResponder,
): Omit<NotificationDelivery, 'destinationId'> {
  return {
    id: one.id,
    kind: one.kind,
    occurredAt: one.occurredAt,
    state: one.state,
    failure: one.failure ?? undefined,
  }
}

function toSettings(one: SettingsResponder): NotificationSettings {
  return {
    notifyLeadMinutes: leadOf(one.notifyLeadMinutes),
    publicOriginKnown: one.publicOriginKnown,
  }
}

function toWatch(one: WatchResponder): ProgrammeWatch {
  return { id: one.id, leadMinutes: leadOf(one.leadMinutes) }
}

function leadOf(minutes: number | string): LeadMinutes {
  const lead = toInt(minutes)

  if (!isLead(lead)) {
    throw new Error(UNREADABLE)
  }

  return lead
}
