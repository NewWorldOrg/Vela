import type { OriginLabel } from '@/lib/format'
import {
  formatBroadcastSpan,
  formatBroadcastStart,
  formatClockSpan,
  formatReservationOrigin,
  formatStamp,
} from '@/lib/format'
import { isDiscardable, isRestorable } from '@/lib/reservations'
import { wordFor } from '@/lib/not-yet-in-this-build'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import type { ChannelKind } from '@/repository/channels'
import { fetchProgramme, toInt } from '@/repository/programmes'
import { listRecordingsByReservation } from '@/repository/recordings'
import type { GuideChannel, ProgramBooking } from '@/repository/programs'
import { fetchServiceChannels, kindOfNetwork } from '@/repository/programs'
import { ruleNames } from '@/repository/rules'
import { whatItSaid } from '@/repository/said'

type ReservationResponder = components['schemas']['ReservationResponder']
type DivergenceResponder =
  components['schemas']['ReservationDivergenceResponder']
type DivergedField = components['schemas']['DivergedField']

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
  raiseTo: number
}

export interface EpgChange {
  field: string
  before: string
  after: string
}

export interface EpgDrift {
  diverged: boolean
  programmeMissing: boolean
  changes: EpgChange[]
  noticedAt?: string
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
  standing: ReservationStanding
  endAtConfirmed: boolean
  receptionUnavailable: boolean
  epg?: EpgDrift
  priority: number
  marginBeforeSeconds: number
  marginAfterSeconds: number
  conflict?: ReservationConflict
  recordingId?: string
  discardable: boolean
  restorable: boolean
}

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

export type EpgDriftKind = 'diverged' | 'missing'

export interface ReservationsFilter {
  show?: 'all'
  epg?: EpgDriftKind
}

export interface EpgDriftTally {
  diverged: number
  missing: number
}

export interface ReservationsResult {
  items: Reservation[]
  total: number
  drift: EpgDriftTally
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
    filter.show === 'all'
      ? carried.items
      : carried.items.filter((one) => !isSettled(one, now))
  const shaped = kept.map((one) =>
    toReservation(one, carried.items, known, recordings, rules, now),
  )
  const drift: EpgDriftTally = {
    diverged: shaped.filter((one) => one.epg?.diverged).length,
    missing: shaped.filter((one) => one.epg?.programmeMissing).length,
  }
  const wanted = filter.epg

  return {
    items:
      wanted === undefined
        ? shaped
        : shaped.filter((one) => drifted(one, wanted)),
    total: carried.total,
    drift,
    filter,
  }
}

function drifted(one: Reservation, kind: EpgDriftKind): boolean {
  return kind === 'missing'
    ? one.epg?.programmeMissing === true
    : one.epg?.diverged === true
}

function isSettled(one: ReservationResponder, now: Date): boolean {
  if (one.standing !== 'complete' && one.standing !== 'cancelled') {
    return false
  }

  return new Date(one.window.endAt).getTime() <= now.getTime()
}

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

  const refused = error?.data as ReservationDiscardRefused | null | undefined
  const refusal = refused ? DISCARD_REFUSAL[refused.refusal] : undefined

  return {
    state: 'rejected',
    message: refusal ?? `${CANNOT_DISCARD}(${response.status})。`,
  }
}

export type ReservationBatch =
  | { state: 'ok'; done: number }
  | { state: 'unauthenticated'; done: number }
  | { state: 'rejected'; done: number; message: string }

export function cancelReservations(
  ids: readonly string[],
): Promise<ReservationBatch> {
  return overEach(ids, cancelReservation)
}

export function discardReservations(
  ids: readonly string[],
): Promise<ReservationBatch> {
  return overEach(ids, discardReservation)
}

async function overEach(
  ids: readonly string[],
  write: (id: string) => Promise<ReservationWrite>,
): Promise<ReservationBatch> {
  let done = 0

  for (const id of ids) {
    const result = await write(id)

    if (result.state === 'unauthenticated') {
      return { state: 'unauthenticated', done }
    }

    if (result.state === 'rejected') {
      return { state: 'rejected', done, message: result.message }
    }

    done += 1
  }

  return { state: 'ok', done }
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
      throw new Error(whatItSaid(error, data) || UNREADABLE)
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
  const stands = {
    standing: r.standing,
    recorded: recordingId !== undefined,
    windowClosed: new Date(r.window.effectiveEndAt).getTime() <= now.getTime(),
  }

  return {
    id: r.id,
    title: r.programme.name,
    note: r.programme.summary || undefined,
    channelName: channel?.name || serviceKeyOf(r),
    channelNo: channel?.no,
    whenLabel: formatBroadcastSpan(r.window.startAt, r.window.endAt),
    origin: formatReservationOrigin(r.origin),
    ruleName: ruleNameOf(r.ruleId, rules),
    standing: r.standing,
    endAtConfirmed,
    receptionUnavailable: r.reception.unavailable,
    epg: toEpgDrift(r.epg),
    priority: toInt(r.priority),
    marginBeforeSeconds: toInt(r.window.marginBeforeSeconds),
    marginAfterSeconds: toInt(r.window.marginAfterSeconds),
    conflict: conflictOf(r, all, known, rules),
    recordingId,
    discardable: isDiscardable(stands),
    restorable: isRestorable(stands),
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

const DIVERGED_FIELD: Record<DivergedField, string> = {
  name: '番組名',
  startAt: '開始',
  endAt: '終了',
  service: 'チャンネル',
}

const MOVES_A_CLOCK: DivergedField[] = ['startAt', 'endAt']

const UNSAID = '—'

function toEpgDrift(epg: DivergenceResponder): EpgDrift | undefined {
  if (!epg.diverged && !epg.programmeMissing) {
    return undefined
  }

  const noticed = epg.detail
    .map((one) => one.detectedAt)
    .sort((a, b) => Date.parse(a) - Date.parse(b))
    .at(-1)

  return {
    diverged: epg.diverged,
    programmeMissing: epg.programmeMissing,
    changes: epg.detail.map((one) => ({
      field: wordFor(DIVERGED_FIELD, one.field),
      before: asSaid(one.field, one.before),
      after: asSaid(one.field, one.after),
    })),
    noticedAt: noticed === undefined ? undefined : formatStamp(noticed),
  }
}

function asSaid(field: DivergedField, said: string | null): string {
  if (!said) {
    return UNSAID
  }

  return MOVES_A_CLOCK.includes(field) ? formatStamp(said) : said
}
