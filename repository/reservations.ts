import type { OriginLabel } from '@/lib/format'
import {
  formatBroadcastSpan,
  formatBroadcastStart,
  formatClockSpan,
  formatReservationOrigin,
} from '@/lib/format'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import type { ChannelKind } from '@/repository/channels'
import { fetchProgramme, toInt } from '@/repository/programmes'
import type { GuideChannel, ProgramBooking } from '@/repository/programs'
import { fetchServiceChannels, kindOfNetwork } from '@/repository/programs'
import { RULES } from '@/repository/rules.fixtures'

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
  stateNote?: string
  conflict?: ReservationConflict
}

export interface Rule {
  id: string
  name: string
  keywords: string
  excludes?: string
  genres: string[]
  channels: string
  target: string
  enabled: boolean
  matchCount: number
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

const MOST_PER_PAGE = 200

const FOLLOWS_THE_END = '延長時は終了に自動で追従します'

const UNREADABLE = '予約を読めませんでした'

const KIND_LABEL: Record<ChannelKind, string> = {
  terrestrial: '地上波',
  bs: 'BS',
  cs110: 'CS110',
}

const HOLDS_A_SEAT: ReservationStanding[] = ['scheduled', 'recording']

export async function listReservations(): Promise<Reservation[]> {
  const [carried, known] = await Promise.all([
    fetchEveryReservation(),
    fetchServiceChannels(),
  ])

  return carried.map((one) => toReservation(one, carried, known))
}

/**
 * The programmes a seat is being held for, by programme. Only a reservation
 * that holds one is here: a cancelled or already settled one leaves the
 * programme free to be asked for again.
 */
export async function listBookings(): Promise<Map<string, ProgramBooking>> {
  const carried = await fetchEveryReservation()
  const bookings = new Map<string, ProgramBooking>()

  for (const one of carried) {
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

export async function listRules(): Promise<Rule[]> {
  return RULES
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

async function fetchEveryReservation(): Promise<ReservationResponder[]> {
  const items: ReservationResponder[] = []
  let page = 1
  let lastPage = 1

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
    page += 1
  } while (page <= lastPage)

  return items
}

export function toReservation(
  r: ReservationResponder,
  all: ReservationResponder[],
  known: GuideChannel[],
): Reservation {
  const channel = channelOf(r, known)
  const endAtConfirmed = r.window.endAtConfirmed

  return {
    id: r.id,
    title: r.programme.name,
    note: r.programme.summary || undefined,
    channelName: channel?.name || serviceKeyOf(r),
    channelNo: channel?.no,
    whenLabel: formatBroadcastSpan(r.window.startAt, r.window.endAt),
    origin: formatReservationOrigin(r.origin),
    ruleName: ruleNameOf(r.ruleId),
    state: r.state,
    standing: r.standing,
    endAtConfirmed,
    receptionUnavailable: r.reception.unavailable,
    priority: toInt(r.priority),
    marginBeforeSeconds: toInt(r.window.marginBeforeSeconds),
    marginAfterSeconds: toInt(r.window.marginAfterSeconds),
    stateNote: endAtConfirmed ? undefined : FOLLOWS_THE_END,
    conflict: conflictOf(r, all, known),
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

function ruleNameOf(ruleId: string | null): string | undefined {
  if (!ruleId) {
    return undefined
  }

  return RULES.find((rule) => rule.id === ruleId)?.name
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
    entries: rivals.map((one) => toConflictEntry(one, known)),
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
): ConflictEntry {
  const channel = channelOf(one, known)
  const span = formatClockSpan(one.window.startAt, one.window.endAt)

  return {
    title: one.programme.name,
    meta: `${channel?.name || serviceKeyOf(one)} · ${span}`,
    origin: formatReservationOrigin(one.origin),
    ruleName: ruleNameOf(one.ruleId),
  }
}
