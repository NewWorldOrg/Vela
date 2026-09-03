import type { OriginLabel } from '@/lib/format'
import {
  formatBroadcastSpan,
  formatBroadcastStart,
  formatClockSpan,
  formatReservationOrigin,
} from '@/lib/format'
import { isDiscardable } from '@/lib/reservations'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import type { ChannelKind } from '@/repository/channels'
import { fetchProgramme, toInt } from '@/repository/programmes'
import { listRecordingsByReservation } from '@/repository/recordings'
import type { GuideChannel, ProgramBooking } from '@/repository/programs'
import { fetchServiceChannels, kindOfNetwork } from '@/repository/programs'
import { ruleNames } from '@/repository/rules'

type ReservationResponder = components['schemas']['ReservationResponder']

/**
 * The four the reservation itself is in, and the eight the screen reads once
 * the recording behind it has a say. `endAtConfirmed` and `reception` are
 * neither: they hold across all of them and are carried beside them.
 */
export type ReservationState = components['schemas']['ReservationState']
export type ReservationStanding = components['schemas']['ReservationStanding']
export type AllocationVerdict = NonNullable<
  components['schemas']['AllocationVerdict']
>

export interface ConflictEntry {
  title: string
  meta: string
  origin: string
  ruleName?: string
}

export interface ReservationConflict {
  headline: string
  body: string
  entries: ConflictEntry[]
  /** The priority that would take the seat from the highest of the entries. */
  raiseTo: number
}

export interface Reservation {
  id: string
  title: string
  note?: string
  channelName: string
  channelNo?: string
  whenLabel: string
  whenNote?: string
  origin: OriginLabel
  ruleName?: string
  state: ReservationState
  standing: ReservationStanding
  endAtConfirmed: boolean
  receptionUnavailable: boolean
  priority: number
  marginBeforeSeconds: number
  marginAfterSeconds: number
  conflict?: ReservationConflict
  /** The recording this reservation came to, where it came to one. */
  recordingId?: string
  /**
   * Whether the record of the reservation may be thrown away. Read from the
   * same conditions the API reads, so the screen offers what the API accepts;
   * the API is still the one that answers, and refuses what has moved on since
   * the list was drawn.
   */
  discardable: boolean
}

/**
 * What a revision asks to change. A field left out is left as it stands, and
 * the API refuses a revision that names nothing.
 */
export interface ReservationRevision {
  priority?: number
  marginBeforeSeconds?: number
  marginAfterSeconds?: number
}

export type ReservationWrite =
  | { state: 'ok'; verdict?: AllocationVerdict }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

type ReservationRefusal = components['schemas']['ReservationFailure']

type ReservationDiscardRefused =
  components['schemas']['ReservationDiscardRefusedResponder']

/**
 * The four answers a deletion can be refused with. They all arrive on the same
 * status, so the reason is read off the body: which one it is says whether to
 * cancel first, to wait, or to throw the recording away first, and a single
 * sentence covering all three would say none of them.
 */
const DISCARD_REFUSAL: Partial<Record<ReservationRefusal, string>> = {
  noSuchReservation: 'この予約は残っていないため、削除できませんでした。',
  stillToBeRecorded:
    'この予約はこれから録画される見込みがあるため、削除できませんでした。先に取り消してください。',
  turningIntoARecording:
    'この予約は録画に切り替わる途中のため、削除できませんでした。録画の記録が現れてから、その録画を先に削除してください。',
  recordingCameOfIt:
    'この予約からは録画ができています。残るのは録画のため、先にその録画を削除してください。',
}

const CANNOT_DISCARD = '予約を削除できませんでした'

/**
 * What the list is narrowed by. A cancelled reservation is what the screen has
 * to answer "why is this not being recorded" with, so it stays while the
 * broadcast is still ahead or under way and is left out once the broadcast has
 * ended. `all` asks for those back; the record itself is never removed.
 */
export interface ReservationsFilter {
  cancelled?: 'all'
}

/**
 * `total` is every reservation the API holds, `items` the ones this filter
 * keeps. Both are said on screen so neither number stands for the other.
 */
export interface ReservationsResult {
  items: Reservation[]
  total: number
  filter: ReservationsFilter
}

const MOST_PER_PAGE = 200

const UNREADABLE = '予約を読めませんでした'

const KIND_LABEL: Record<ChannelKind, string> = {
  terrestrial: '地上波',
  bs: 'BS',
  cs110: 'CS110',
}

const HOLDS_A_SEAT: ReservationStanding[] = ['scheduled', 'recording']

export async function listReservations(
  filter: ReservationsFilter = {},
  now: Date = new Date(),
): Promise<ReservationsResult> {
  const [carried, known, recordings, rules] = await Promise.all([
    fetchEveryReservation(),
    fetchServiceChannels(),
    listRecordingsByReservation(),
    ruleNames(),
  ])
  const kept =
    filter.cancelled === 'all'
      ? carried.items
      : carried.items.filter((one) => !isSpentCancellation(one, now))

  return {
    items: kept.map((one) =>
      toReservation(one, carried.items, known, recordings, rules, now),
    ),
    total: carried.total,
    filter,
  }
}

/**
 * The broadcast is over at the end of its window, so the reservation has
 * nothing left to explain about it. The margin the recording would have run on
 * is not part of the broadcast and is not read here.
 */
function isSpentCancellation(one: ReservationResponder, now: Date): boolean {
  return (
    one.standing === 'cancelled' &&
    new Date(one.window.endAt).getTime() <= now.getTime()
  )
}

/**
 * The programmes a seat is being held for, by programme. Only a reservation
 * that holds one is here: a cancelled or already settled one leaves the
 * programme free to be asked for again.
 */
export async function listBookings(): Promise<Map<string, ProgramBooking>> {
  const carried = await fetchEveryReservation()
  const bookings = new Map<string, ProgramBooking>()

  for (const one of carried.items) {
    if (one.standing !== 'scheduled') {
      continue
    }

    bookings.set(one.programme.id, {
      id: one.id,
      priority: toInt(one.priority),
      marginBeforeSeconds: toInt(one.window.marginBeforeSeconds),
      marginAfterSeconds: toInt(one.window.marginAfterSeconds),
    })
  }

  return bookings
}

export async function createReservation(
  programmeId: string,
): Promise<ReservationWrite> {
  const programme = await fetchProgramme(programmeId)

  if (!programme) {
    return {
      state: 'rejected',
      message:
        'この番組は番組表にもう無いため、予約できませんでした。番組表を読み直してください。',
    }
  }

  const { data, response } = await carinaClient().POST('/api/reservations', {
    body: {
      programme: programmeId,
      programmeStartsAt: programme.startsAt,
    },
  })

  return toWrite(
    response,
    data?.data?.verdict ?? undefined,
    {
      404: 'この番組は番組表にもう無いため、予約できませんでした。番組表を読み直してください。',
      409: 'この番組はすでに予約されています。取り消した予約も残るため、作り直すのではなく予約一覧から復元してください。',
      503: '録画の準備ができていないため、予約できませんでした。時間をおいてからもう一度お試しください。',
    },
    '予約できませんでした。',
  )
}

export async function cancelReservation(id: string): Promise<ReservationWrite> {
  const { data, response } = await carinaClient().POST(
    '/api/reservations/{id}/cancel',
    { params: { path: { id } } },
  )

  return toWrite(
    response,
    data?.data?.verdict ?? undefined,
    {
      404: 'この予約は残っていないため、取り消せませんでした。',
      409: 'この予約はいま録画中か、すでに終わっているため、取り消せませんでした。最新の状態を読み直してください。',
    },
    '予約を取り消せませんでした。',
  )
}

export async function restoreReservation(
  id: string,
): Promise<ReservationWrite> {
  const { data, response } = await carinaClient().POST(
    '/api/reservations/{id}/restore',
    { params: { path: { id } } },
  )

  return toWrite(
    response,
    data?.data?.verdict ?? undefined,
    {
      404: 'この予約は残っていないため、復元できませんでした。',
      409: 'この予約は取り消されていないため、復元できませんでした。最新の状態を読み直してください。',
    },
    '予約を復元できませんでした。',
  )
}

export async function setReservationPriority(
  id: string,
  priority: number,
): Promise<ReservationWrite> {
  const { data, response } = await carinaClient().PATCH(
    '/api/reservations/{id}',
    { params: { path: { id } }, body: { priority } },
  )

  return toWrite(
    response,
    data?.data?.verdict ?? undefined,
    {
      404: 'この予約は残っていないため、優先度を変えられませんでした。',
      409: 'この予約はいま録画中か、すでに終わっているため、優先度を変えられませんでした。最新の状態を読み直してください。',
    },
    '優先度を変えられませんでした。',
  )
}

export async function reviseReservation(
  id: string,
  revision: ReservationRevision,
): Promise<ReservationWrite> {
  const { data, response } = await carinaClient().PATCH(
    '/api/reservations/{id}',
    { params: { path: { id } }, body: revision },
  )

  return toWrite(
    response,
    data?.data?.verdict ?? undefined,
    {
      400: '入力された値がこの予約に使える範囲を外れているため、変えられませんでした。',
      404: 'この予約は残っていないため、変えられませんでした。',
      409: 'この予約はいま録画中か、すでに終わっているため、変えられませんでした。最新の状態を読み直してください。',
      503: 'チューナーの空きを数えられないため、変えられませんでした。時間をおいてからお試しください。',
    },
    '予約を変えられませんでした。',
  )
}

/**
 * Throws the record of the reservation away. Cancelling keeps the record and
 * is what a reservation still to be recorded is given; this is what removes
 * one that has nothing left to explain.
 */
export async function discardReservation(
  id: string,
): Promise<ReservationWrite> {
  const { error, response } = await carinaClient().DELETE(
    '/api/reservations/{id}',
    { params: { path: { id } } },
  )

  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  if (response.ok) {
    return { state: 'ok' }
  }

  // A refusal arrives as `error`, not as `data`: the generated client hands
  // back the parsed body under whichever of the two the status calls for.
  const refused = error?.data as ReservationDiscardRefused | null | undefined
  const refusal = refused ? DISCARD_REFUSAL[refused.refusal] : undefined

  return {
    state: 'rejected',
    message: refusal ?? `${CANNOT_DISCARD}(${response.status})。`,
  }
}

function toWrite(
  response: Response,
  verdict: AllocationVerdict | undefined,
  refusals: Partial<Record<number, string>>,
  fallback: string,
): ReservationWrite {
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

  return { state: 'ok', verdict }
}

async function fetchEveryReservation(): Promise<{
  items: ReservationResponder[]
  total: number
}> {
  const items: ReservationResponder[] = []
  let page = 1
  let lastPage = 1
  let total = 0

  do {
    const { data, error } = await carinaClient().GET('/api/reservations', {
      params: {
        query: {
          sort: 'startAt',
          descending: false,
          page,
          perPage: MOST_PER_PAGE,
        },
      },
    })

    if (error || !data?.data) {
      throw new Error(data?.message || UNREADABLE)
    }

    items.push(...data.data.items)
    lastPage = toInt(data.data.lastPage)
    total = toInt(data.data.total)
    page += 1
  } while (page <= lastPage)

  return { items, total }
}

export function toReservation(
  r: ReservationResponder,
  all: ReservationResponder[],
  known: GuideChannel[],
  recordings: Map<string, string>,
  rules: ReadonlyMap<string, string>,
  now: Date,
): Reservation {
  const channel = channelOf(r, known)
  const endAtConfirmed = r.window.endAtConfirmed
  const recordingId = recordings.get(r.id)

  return {
    id: r.id,
    title: r.programme.name,
    note: r.programme.summary || undefined,
    channelName: channel?.name || serviceKeyOf(r),
    channelNo: channel?.no,
    whenLabel: formatBroadcastSpan(r.window.startAt, r.window.endAt),
    origin: formatReservationOrigin(r.origin),
    ruleName: ruleNameOf(r.ruleId, rules),
    state: r.state,
    standing: r.standing,
    endAtConfirmed,
    receptionUnavailable: r.reception.unavailable,
    priority: toInt(r.priority),
    marginBeforeSeconds: toInt(r.window.marginBeforeSeconds),
    marginAfterSeconds: toInt(r.window.marginAfterSeconds),
    conflict: conflictOf(r, all, known, rules),
    recordingId,
    discardable: isDiscardable({
      standing: r.standing,
      recorded: recordingId !== undefined,
      windowClosed:
        new Date(r.window.effectiveEndAt).getTime() <= now.getTime(),
    }),
  }
}

function serviceKeyOf(r: ReservationResponder): string {
  return `${toInt(r.programme.networkId)}-${toInt(r.programme.serviceId)}`
}

function channelOf(
  r: ReservationResponder,
  known: GuideChannel[],
): GuideChannel | undefined {
  const key = serviceKeyOf(r)

  return known.find((one) => one.id === key)
}

function ruleNameOf(
  ruleId: string | null,
  rules: ReadonlyMap<string, string>,
): string | undefined {
  return ruleId ? rules.get(ruleId) : undefined
}

/**
 * Which reservations took the seat this one was refused. The list answers with
 * neither the verdict's counterparts nor the transport stream a seat is shared
 * over, so this is read off the windows themselves: the ones that overlap,
 * still hold a seat, and sit on another network — services of one network
 * share the stream, and so the tuner.
 */
function conflictOf(
  r: ReservationResponder,
  all: ReservationResponder[],
  known: GuideChannel[],
  rules: ReadonlyMap<string, string>,
): ReservationConflict | undefined {
  if (r.standing !== 'conflict') {
    return undefined
  }

  const rivals = all.filter((one) => takesTheSeatFrom(one, r))

  if (rivals.length === 0) {
    return undefined
  }

  const seats = new Set(rivals.map((one) => toInt(one.programme.networkId)))
  const kind =
    channelOf(r, known)?.kind ?? kindOfNetwork(toInt(r.programme.networkId))

  return {
    headline: `同時刻に${KIND_LABEL[kind]}チューナー ${seats.size} 本が録画予定です`,
    body: `${formatBroadcastStart(r.window.startAt)} の開始時点で空きがなく、この予約にはチューナーを割り当てられません。`,
    entries: rivals.map((one) => toConflictEntry(one, known, rules)),
    raiseTo: Math.max(...rivals.map((one) => toInt(one.priority))) + 1,
  }
}

function takesTheSeatFrom(
  one: ReservationResponder,
  r: ReservationResponder,
): boolean {
  return (
    one.id !== r.id &&
    HOLDS_A_SEAT.includes(one.standing) &&
    toInt(one.programme.networkId) !== toInt(r.programme.networkId) &&
    overlaps(one, r)
  )
}

function overlaps(one: ReservationResponder, other: ReservationResponder) {
  const from = (at: string) => new Date(at).getTime()

  return (
    from(one.window.effectiveStartAt) < from(other.window.effectiveEndAt) &&
    from(other.window.effectiveStartAt) < from(one.window.effectiveEndAt)
  )
}

function toConflictEntry(
  one: ReservationResponder,
  known: GuideChannel[],
  rules: ReadonlyMap<string, string>,
): ConflictEntry {
  const channel = channelOf(one, known)
  const span = formatClockSpan(one.window.startAt, one.window.endAt)

  return {
    title: one.programme.name,
    meta: `${channel?.name || serviceKeyOf(one)} · ${span}`,
    origin: formatReservationOrigin(one.origin),
    ruleName: ruleNameOf(one.ruleId, rules),
  }
}
