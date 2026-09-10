import { cache } from 'react'

import {
  formatBytes,
  formatLength,
  formatPlayhead,
  formatStamp,
} from '@/lib/format'
import { castInExtended, leadOfExtended } from '@/lib/programme-extended'
import { RECORDING_STATE_FILTERS } from '@/lib/recordings'
import { genreLabelOfKind } from '@/lib/search-condition'
import { NOT_YET_IN_THIS_BUILD, shapeFor } from '@/lib/not-yet-in-this-build'
import {
  INCOMPLETE_TABLES,
  LOCKED_WITHOUT_DATA,
  NO_LOCK,
  numbered,
  UNEXPECTED_STREAM,
  type FailureClass,
} from '@/repository/scan-failures'
import type { StationLogo } from '@/repository/channels'
import type { EncodeStanding } from '@/repository/encode-terms'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import { toInt } from '@/repository/programmes'
import { fetchServiceChannels } from '@/repository/programs'
import { videoThumbnailHref } from '@/repository/video-paths'
import type { GuideChannel } from '@/repository/programs'
import { whatItSaid } from '@/repository/said'

type RecordingResponder = components['schemas']['RecordingResponder']
type DetailResponder = components['schemas']['RecordingDetailResponder']
type FaultResponder = components['schemas']['RecordingFaultResponder']
type Fault = components['schemas']['RecordingFault']
type TuneFailure = NonNullable<components['schemas']['TuneFailureKind']>
type DropBucket = components['schemas']['DropBucketResponder']
type Counted = number | string
type Countable = Counted | null

export type RecordingOutcome = 'recording' | 'complete' | 'truncated' | 'failed'

export type QualityLevel = Exclude<
  components['schemas']['QualityLevel'],
  'unmeasured'
>
export type ThumbnailState = 'shot' | 'pending' | 'none' | 'error'

export interface FailureReason {
  title: string
  body?: string
  note?: string
  noticedAt?: string
}

export interface RecordingQuality {
  measured: boolean
  level?: QualityLevel
  detail?: string
}

export interface Recording {
  id: string
  reservationId?: string
  title: string
  note?: string
  description?: string
  cast?: string[]
  segments?: number
  channel: string
  channelNo?: string
  channelLogo?: StationLogo
  genre?: string
  year: number
  startedAt: string
  recordedAtLabel: string
  recordedAtNote?: string
  recordedRange: string
  lengthSec?: number
  expectedLengthSec?: number
  sizeBytes?: number
  sizeObservedAt?: string
  filePath: string
  fileMissing?: boolean
  outcome: RecordingOutcome
  outcomeDetail?: string
  quality: RecordingQuality
  scrambledShare?: number
  encode: EncodeStanding
  thumbnail: ThumbnailState
  thumbnailLabel?: string
  thumbnailHref?: string
}

export interface RecordingsFilter {
  q?: string
  year?: string
  genre?: string
  state?: string
  ch?: string
}

function matchesState(r: Recording, state: string) {
  switch (state) {
    case '問題のある録画':
      return (
        r.quality.level === 'warning' || r.quality.level === 'mayNotBeWatchable'
      )
    case '尻切れ・失敗':
      return r.outcome === 'truncated' || r.outcome === 'failed'
    case '未計測':
      return !r.quality.measured
    default:
      return true
  }
}

function normalize(text: string) {
  return text.normalize('NFKC').toLowerCase()
}

function matchesQuery(r: Recording, tokens: string[]) {
  const fields = [r.title, r.note, r.description, ...(r.cast ?? [])]
    .filter((f): f is string => Boolean(f))
    .map(normalize)
  return tokens.every((token) => fields.some((f) => f.includes(token)))
}

export interface RecordingsResult {
  items: Recording[]
  total: number
  channels: string[]
  years: number[]
  genres: string[]
  filter: RecordingsFilter
}

export async function listRecordings(
  raw: RecordingsFilter,
): Promise<RecordingsResult> {
  const [carried, known] = await Promise.all([
    fetchEveryRecording(),
    fetchServiceChannels(),
  ])
  const now = new Date()
  const grouped = broadcastGroupSizes(carried.items)
  const all = carried.items.map((one) =>
    toRecording(one, known, now, segmentsOf(one, grouped)),
  )
  const channels = [...new Set(all.map((r) => r.channel))]
  const years = [...new Set(all.map((r) => r.year))].sort((a, b) => b - a)
  const genres = [
    ...new Set(all.map((r) => r.genre).filter((g): g is string => Boolean(g))),
  ]
  const filter: RecordingsFilter = {
    q: raw.q?.trim() || undefined,
    year: raw.year && years.includes(Number(raw.year)) ? raw.year : undefined,
    genre: raw.genre && genres.includes(raw.genre) ? raw.genre : undefined,
    state:
      raw.state &&
      (RECORDING_STATE_FILTERS as readonly string[]).includes(raw.state)
        ? raw.state
        : undefined,
    ch: raw.ch && channels.includes(raw.ch) ? raw.ch : undefined,
  }
  const tokens = filter.q
    ? normalize(filter.q).split(/\s+/).filter(Boolean)
    : []
  const items = all.filter((r) => {
    if (tokens.length > 0 && !matchesQuery(r, tokens)) {
      return false
    }
    if (filter.year && String(r.year) !== filter.year) {
      return false
    }
    if (filter.genre && r.genre !== filter.genre) {
      return false
    }
    if (filter.state && !matchesState(r, filter.state)) {
      return false
    }
    if (filter.ch && r.channel !== filter.ch) {
      return false
    }
    return true
  })
  return { items, total: carried.total, channels, years, genres, filter }
}
export async function listRecordingsByReservation(): Promise<
  Map<string, string>
> {
  const carried = await fetchEveryRecording()
  const byReservation = new Map<string, string>()

  for (const one of carried.items) {
    if (one.reservationId) {
      byReservation.set(one.reservationId, one.id)
    }
  }

  return byReservation
}

export interface RecordingName {
  title: string
  startedAt: string
  outputRoot: string
}

export async function listRecordingNames(): Promise<
  Map<string, RecordingName>
> {
  const carried = await fetchEveryRecording()
  const names = new Map<string, RecordingName>()

  for (const one of carried.items) {
    names.set(one.id, {
      title: one.programme.name,
      startedAt: one.startedAt,
      outputRoot: one.outputRoot,
    })
  }

  return names
}

export interface QualitySpot {
  at: string
  packets: string
  second: number
}

export interface RecordingDetail extends Recording {
  genres?: string[]
  synopsis?: string
  outcomeBody?: string
  reconcile?: { size: string; written: string; planned: string }
  interruptions?: { main: string }
  tunerUnit?: { main: string }
  eoverflow?: string
  scramble?: { main: string }
  stopReason?: string
  failureReason?: FailureReason
  thumbnailState?: { main: string; sub?: string }
  qualityRatio?: string
  qualityTotal?: string
  qualitySpots?: QualitySpot[]
  live?: {
    elapsed: string
    written: string
    drops: string
    rest: string
    updatedAt: string
  }
}

export const getRecording = cache(
  async (id: string): Promise<RecordingDetail | undefined> => {
    const { data, error, response } = await carinaClient().GET(
      '/api/recordings/{id}',
      {
        params: { path: { id } },
      },
    )

    if (response.status === 404 || response.status === 400) {
      return undefined
    }

    if (!data?.data) {
      throw new Error(whatItSaid(error, data) || '録画を読めませんでした')
    }

    const known = await fetchServiceChannels()

    return toDetail(data.data, known, new Date())
  },
)

export type ThumbnailRemake = components['schemas']['ThumbnailRemake']

export type ThumbnailWrite =
  | { state: 'ok'; remake: ThumbnailRemake }
  | { state: 'rejected'; message: string }

const THUMBNAIL_REFUSAL: Partial<Record<number, string>> = {
  400: 'この録画の指定が正しくありません。',
  404: 'この録画は残っていません。',
  409: '録画中はサムネイルを作り直せません。',
  503: '録画ファイルかサムネイルの保存先に到達できません。',
}

export async function remakeThumbnail(id: string): Promise<ThumbnailWrite> {
  const { data, response } = await carinaClient().POST(
    '/api/recordings/{id}/thumbnail',
    { params: { path: { id } } },
  )

  if (response.ok && data?.data) {
    return { state: 'ok', remake: data.data.remake }
  }

  return {
    state: 'rejected',
    message:
      THUMBNAIL_REFUSAL[response.status] ??
      `サムネイルを作り直せませんでした(${response.status})。`,
  }
}

type RecordingRefusal = components['schemas']['RecordingFailure']

type RecordingDiscardRefused =
  components['schemas']['RecordingDiscardRefusedResponder']

export type RecordingDiscarded =
  | { state: 'ok'; filesRemoved: number }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

const DISCARD_REFUSAL: Record<RecordingRefusal, string> = {
  noSuchRecording: 'この録画は残っていないため、削除できませんでした。',
  stillRecording:
    'この録画はまだ書き込み中です。録画を止めてから削除してください。',
  oneIsAlreadyBeingDiscarded:
    '別の録画の削除が進行中です。削除は同時に 1 件までのため、終わってからもう一度お試しください。',
  rootOutOfReach:
    '録画ファイルの保存先に到達できないため、削除を実行していません。録画ファイルは残っています。',
  fileOutOfReach:
    '録画ファイルに到達できないため、削除を実行していません。録画ファイルは残っています。',
  driverUnreachable:
    '保存先の一覧を確認できないため、削除を実行していません。録画ファイルは残っています。',
  driverRefused:
    '保存先の一覧の確認を断られたため、削除を実行していません。録画ファイルは残っています。',
  filesLeftBehind:
    '一部の録画ファイルを削除できませんでした。録画の記録が残っているのは削除が終わっていないためで、もう一度削除すると残りから続きます。',
  alreadyEnded: 'この録画はすでに終わっているため、削除できませんでした。',
  notBeingWritten:
    'この録画は書き込み中ではないため、削除できませんでした。最新の状態を読み直してください。',
  nowhereToPutPictures:
    'サムネイルの保存先に到達できないため、削除を実行していません。録画ファイルは残っています。',
  tookTooLong:
    '保存先の確認に時間がかかりすぎたため、削除を実行していません。録画ファイルは残っています。',
}

const CANNOT_DISCARD = '録画を削除できませんでした'

export async function discardRecording(
  id: string,
): Promise<RecordingDiscarded> {
  const { data, error, response } = await carinaClient().DELETE(
    '/api/recordings/{id}',
    { params: { path: { id } } },
  )

  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  if (response.ok && data?.data) {
    return {
      state: 'ok',
      filesRemoved: toInt(
        (data.data as { filesRemoved: Counted }).filesRemoved,
      ),
    }
  }

  const refused = error?.data as RecordingDiscardRefused | null | undefined
  const refusal = refused
    ? shapeFor(DISCARD_REFUSAL, refused.refusal, undefined)
    : undefined

  return {
    state: 'rejected',
    message: refusal ?? `${CANNOT_DISCARD}(${response.status})。`,
  }
}

const MOST_PER_PAGE = 200

interface EveryRecording {
  items: RecordingResponder[]
  total: number
}

async function fetchEveryRecording(): Promise<EveryRecording> {
  const items: RecordingResponder[] = []
  let total = 0
  let page = 1
  let lastPage = 1

  do {
    const { data, error } = await carinaClient().GET('/api/recordings', {
      params: {
        query: {
          sort: 'startedAt',
          descending: true,
          page,
          perPage: MOST_PER_PAGE,
        },
      },
    })

    if (error || !data?.data) {
      throw new Error(whatItSaid(error, data) || '録画を読めませんでした')
    }

    items.push(...data.data.items)
    total = toInt(data.data.total)
    lastPage = toInt(data.data.lastPage)
    page += 1
  } while (page <= lastPage)

  return { items, total }
}

export function toRecording(
  r: RecordingResponder,
  known: GuideChannel[],
  now: Date,
  segments?: number,
): Recording {
  const channel = channelOf(r, known)
  const outcome = outcomeOf(r)
  const startedAt = new Date(r.startedAt)
  const sizeBytes = counted(r.fileSizeBytes)
  const writtenMs = toInt(r.writtenDurationMs)
  const quality = qualityOf(r, outcome)
  const thumbnail = thumbnailOf(r)
  const totalPackets = counted(r.drops.ccTotalPackets) ?? 0
  const scrambled = counted(r.drops.scrambledPackets)
  const cast = castInExtended(r.programme.extended)

  return {
    id: r.id,
    reservationId: r.reservationId ?? undefined,
    title: r.programme.name,
    note: leadOfExtended(r.programme.extended),
    description: r.programme.summary || undefined,
    cast: cast.length > 0 ? cast : undefined,
    segments,
    genre: genresOf(r)[0],
    channel: channel?.name || serviceKeyOf(r),
    channelNo: channel?.no,
    channelLogo: channel?.logo,
    year: Number(jst(startedAt).year),
    startedAt: r.startedAt,
    recordedAtLabel: recordedAtLabelOf(startedAt, now),
    recordedAtNote: outcome === 'recording' ? 'いま' : undefined,
    recordedRange: recordedRangeOf(r, outcome),
    lengthSec:
      outcome === 'recording' ? undefined : Math.round(writtenMs / 1000),
    expectedLengthSec:
      outcome === 'truncated'
        ? Math.round(toInt(r.expectedWindow.durationMs) / 1000)
        : undefined,
    sizeBytes,
    filePath: `${r.outputRoot.replace(/\/+$/, '')}/${r.fileName}`,
    outcome,
    outcomeDetail: faultTitleOf(r.outcomeDetail),
    quality,
    encode: r.encode.standing,
    scrambledShare:
      scrambled == null || totalPackets === 0
        ? undefined
        : scrambled / totalPackets,
    thumbnail: thumbnail.state,
    thumbnailLabel: thumbnail.label,
    thumbnailHref:
      thumbnail.state === 'shot' ? videoThumbnailHref(r.id) : undefined,
  }
}

function toDetail(
  d: DetailResponder,
  known: GuideChannel[],
  now: Date,
): RecordingDetail {
  const r = d.recording
  const base = toRecording(r, known, now)
  const named = leadingFault(r.outcomeDetail)
  const measured = r.drops.ccMeasured
  const dropped = counted(r.drops.ccDroppedPackets) ?? 0
  const totalPackets = counted(r.drops.ccTotalPackets) ?? 0
  const scrambled = counted(r.drops.scrambledPackets)
  const genres = genresOf(r)

  return {
    ...base,
    genres: genres.length > 0 ? genres : undefined,
    sizeObservedAt: observedLabelOf(d, base.outcome),
    synopsis: r.programme.summary || undefined,
    outcomeBody: outcomeBodyOf(r, base),
    reconcile: reconcileOf(d, base),
    interruptions: {
      main: `中断 ${d.interruptions.length} 回 / 再開 ${toInt(r.resumeCount)} 回`,
    },
    tunerUnit: r.tunerDeviceId ? { main: r.tunerDeviceId } : undefined,
    eoverflow: `${grouped(toInt(r.drops.eovfCount))} 回`,
    scramble:
      scrambled == null
        ? undefined
        : { main: `${grouped(scrambled)} パケット` },
    stopReason: stopReasonOf(d),
    failureReason: failureReasonOf(base.outcome, named, r.outcomeDetail),
    thumbnailState: shapeFor(
      THUMBNAIL_ROWS,
      r.thumbnail.state,
      THUMBNAIL_ROW_NOT_YET_KNOWN,
    ),
    qualityTotal: measured ? grouped(dropped) : undefined,
    qualityRatio: measured
      ? ratioOf(dropped, totalPackets).toFixed(4)
      : undefined,
    qualitySpots: spotsOf(d.positions.buckets),
    live: base.outcome === 'recording' ? liveOf(d, base, now) : undefined,
  }
}

function genresOf(r: RecordingResponder): string[] {
  const named: string[] = []

  for (const genre of r.programme.genres) {
    const label = genreLabelOfKind(toInt(genre.kind))

    if (!named.includes(label)) {
      named.push(label)
    }
  }

  return named
}

function broadcastGroupSizes(items: RecordingResponder[]): Map<string, number> {
  const sizes = new Map<string, number>()

  for (const one of items) {
    const key = one.broadcastGroup.key

    if (key) {
      sizes.set(key, (sizes.get(key) ?? 0) + 1)
    }
  }

  return sizes
}

function segmentsOf(
  r: RecordingResponder,
  sizes: Map<string, number>,
): number | undefined {
  const key = r.broadcastGroup.key
  const size = key ? sizes.get(key) : undefined

  return size !== undefined && size > 1 ? size : undefined
}

function serviceKeyOf(r: RecordingResponder): string {
  return `${toInt(r.programme.networkId)}-${toInt(r.programme.serviceId)}`
}

function channelOf(
  r: RecordingResponder,
  known: GuideChannel[],
): GuideChannel | undefined {
  const key = serviceKeyOf(r)

  return known.find((one) => one.id === key)
}

function outcomeOf(r: RecordingResponder): RecordingOutcome {
  return r.outcome ?? 'recording'
}

function qualityOf(
  r: RecordingResponder,
  outcome: RecordingOutcome,
): RecordingQuality {
  if (r.drops.quality === 'unmeasured') {
    return {
      measured: false,
      detail: outcome === 'recording' ? '録画の完了時に確定します' : undefined,
    }
  }

  const dropped = counted(r.drops.ccDroppedPackets) ?? 0
  const scrambled = counted(r.drops.scrambledPackets)

  return {
    measured: true,
    level: r.drops.quality,
    detail: scrambled
      ? `ドロップ ${grouped(dropped)} / スクランブル残存 ${grouped(scrambled)}`
      : `ドロップ ${grouped(dropped)}`,
  }
}

function ratioOf(dropped: number, total: number): number {
  return total === 0 ? 0 : (dropped / total) * 100
}

const THUMBNAILS: Record<
  components['schemas']['ThumbnailState'],
  { state: ThumbnailState; label?: string }
> = {
  ready: { state: 'shot' },
  pending: { state: 'pending', label: '未生成' },
  failed: { state: 'error', label: '生成失敗' },
  skipped: { state: 'none', label: '作成されません' },
}

const THUMBNAIL_NOT_YET_KNOWN: { state: ThumbnailState; label?: string } = {
  state: 'none',
  label: NOT_YET_IN_THIS_BUILD,
}

function thumbnailOf(r: RecordingResponder) {
  return shapeFor(THUMBNAILS, r.thumbnail.state, THUMBNAIL_NOT_YET_KNOWN)
}

const THUMBNAIL_ROWS: Record<
  components['schemas']['ThumbnailState'],
  { main: string; sub?: string }
> = {
  ready: { main: '生成済み' },
  pending: { main: '未生成' },
  failed: { main: '生成失敗' },
  skipped: { main: '録画が失敗したため作成されません' },
}

const THUMBNAIL_ROW_NOT_YET_KNOWN: { main: string; sub?: string } = {
  main: NOT_YET_IN_THIS_BUILD,
}

const STOPS: Partial<Record<Fault, string>> = {
  stoppedByHand: '手動停止',
  tunerContended: '競合により落とされた',
  drainGraceExpired: '終了処理が時間切れ',
  driverLost: 'チューナーとの接続が切れた',
  stoppedUnasked: '予期しない停止',
}

const FAILURES: Partial<Record<Fault, { title: string; body?: string }>> = {
  tuneFailed: { title: '選局失敗' },
  diskExhausted: {
    title: '書き込み中にディスクが尽きた',
    body: 'その時点までの実績を録画の記録に残して停止しました。',
  },
  refusedByDiskPrecheck: {
    title: 'ディスク不足で開始せず',
    body: '開始前の事前チェックで不足を検出しました。',
  },
  scramblingUnresolved: {
    title: 'スクランブル解除失敗',
    body: '閾値を超えた残存パケットを検出しました。',
  },
  nothingLanded: {
    title: '0 バイトで終わった',
    body: '録画ファイルは残っていますが、中身がありません。',
  },
  sizeUnobserved: {
    title: 'ファイルの大きさを観測できなかった',
    body: '録画ファイルの大きさを確かめられないまま終わりました。',
  },
  shortOfTheWindow: {
    title: '書けた尺が予定に届かなかった',
  },
  lighterThanTheStream: {
    title: 'ファイルが尺のわりに小さい',
    body: '書けた尺から見込まれる大きさに届きません。',
  },
  heavierThanTheStream: {
    title: 'ファイルが尺のわりに大きい',
    body: '書けた尺から見込まれる大きさを超えています。',
  },
}

const TUNE_FAILURES: Record<TuneFailure, FailureClass> = {
  noLock: NO_LOCK,
  noData: LOCKED_WITHOUT_DATA,
  incompletePsi: INCOMPLETE_TABLES,
  streamMismatch: UNEXPECTED_STREAM,
}

function leadingFault(detail: FaultResponder[]): FaultResponder | undefined {
  return detail.find((one) => FAILURES[one.fault])
}

function faultTitleOf(detail: FaultResponder[]): string | undefined {
  const named = leadingFault(detail)

  return named ? FAILURES[named.fault]?.title : undefined
}

function bodyOf(
  failure: { title: string; body?: string },
  fault: Fault | undefined,
  detail: FaultResponder[],
): string | undefined {
  if (fault !== 'tuneFailed') {
    return failure.body
  }

  const kind = detail.find((one) => one.fault === 'tuneFailed')?.tuneFailure

  if (!kind) {
    return undefined
  }

  const classed = shapeFor(TUNE_FAILURES, kind, undefined)

  return classed ? numbered(classed) : NOT_YET_IN_THIS_BUILD
}

function failureReasonOf(
  outcome: RecordingOutcome,
  named: FaultResponder | undefined,
  detail: FaultResponder[],
): FailureReason | undefined {
  if (outcome !== 'failed') {
    return undefined
  }

  const failure = named ? FAILURES[named.fault] : undefined

  if (!failure) {
    const first = detail.at(0)

    return first
      ? { title: NOT_YET_IN_THIS_BUILD, ...saidOf(first) }
      : undefined
  }

  return {
    title: failure.title,
    body: bodyOf(failure, named?.fault, detail),
    ...saidOf(named),
  }
}

function saidOf(named: FaultResponder | undefined): {
  note?: string
  noticedAt?: string
} {
  if (named === undefined || !named.note) {
    return {}
  }

  return { note: named.note, noticedAt: formatStamp(named.noticedAt) }
}

function stopReasonOf(d: DetailResponder): string | undefined {
  const named = d.recording.outcomeDetail.find((one) => STOPS[one.fault])

  if (named) {
    return STOPS[named.fault]
  }

  return d.recording.abortedAt ? '終了時刻に到達' : undefined
}

function outcomeBodyOf(
  r: RecordingResponder,
  base: Recording,
): string | undefined {
  if (base.outcome === 'recording' || base.sizeBytes == null) {
    return undefined
  }

  const planned = formatLength(
    Math.round(toInt(r.expectedWindow.durationMs) / 1000),
  )
  const written = formatLength(Math.round(toInt(r.writtenDurationMs) / 1000))

  return `書けた尺 ${written} / 予定 ${planned} · ${formatBytes(base.sizeBytes)}`
}

function reconcileOf(
  d: DetailResponder,
  base: Recording,
): { size: string; written: string; planned: string } | undefined {
  if (!d.reconciliation.sizeObserved || base.sizeBytes == null) {
    return undefined
  }

  return {
    size: formatBytes(base.sizeBytes),
    written: formatLength(
      Math.round(toInt(d.reconciliation.writtenDurationMs) / 1000),
    ),
    planned: formatLength(
      Math.round(toInt(d.reconciliation.expectedWindow.durationMs) / 1000),
    ),
  }
}

function liveOf(d: DetailResponder, base: Recording, now: Date) {
  const r = d.recording
  const started = new Date(r.startedAt).getTime()
  const ends = new Date(r.expectedWindow.end).getTime()
  const measured = r.drops.ccMeasured
  const updatedAt = r.drops.measuredUpdatedAt ?? d.reconciliation.observedAt

  return {
    elapsed: formatLength(secondsBetween(started, now.getTime())),
    written: base.sizeBytes == null ? '—' : formatBytes(base.sizeBytes),
    drops: measured
      ? `${grouped(counted(r.drops.ccDroppedPackets) ?? 0)} パケット`
      : '未計測',
    rest: formatLength(secondsBetween(now.getTime(), ends)),
    updatedAt: updatedAt ? clockWithSeconds(new Date(updatedAt)) : '—',
  }
}

function secondsBetween(from: number, to: number): number {
  return Math.max(0, Math.floor((to - from) / 1000))
}

export function spotsOf(buckets: DropBucket[]): QualitySpot[] {
  const byMinute = new Map<number, number>()

  for (const bucket of buckets) {
    const packets = toInt(bucket.continuity)

    if (packets === 0) {
      continue
    }

    const minute = Math.floor(toInt(bucket.second) / 60)

    byMinute.set(minute, (byMinute.get(minute) ?? 0) + packets)
  }

  return [...byMinute.entries()]
    .sort(([left], [right]) => left - right)
    .map(([minute, packets]) => ({
      at: `${formatPlayhead(minute * 60)} 付近`,
      packets: `${grouped(packets)} パケット`,
      second: minute * 60,
    }))
}

function counted(value: Countable): number | undefined {
  return value == null ? undefined : toInt(value)
}

export function grouped(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function spanLabel(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  const hours = Math.floor(minutes / 60)

  return hours > 0 ? `${hours}時間${minutes % 60}分` : `${minutes}分`
}

const JST = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tokyo',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const WEEKDAY = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  weekday: 'short',
})

interface Spelled {
  year: string
  month: string
  day: string
  hour: string
  minute: string
  second: string
}

function jst(at: Date): Spelled {
  const parts = JST.formatToParts(at)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  }
}

function dayOf(at: Date): string {
  const spelled = jst(at)

  return `${spelled.month}/${spelled.day}(${WEEKDAY.format(at)})`
}

function clockOf(at: Date): string {
  const spelled = jst(at)

  return `${spelled.hour}:${spelled.minute}`
}

export function clockWithSeconds(at: Date): string {
  const spelled = jst(at)

  return `${spelled.hour}:${spelled.minute}:${spelled.second}`
}

export function recordedAtLabelOf(startedAt: Date, now: Date): string {
  const spelled = jst(startedAt)
  const thisYear = jst(now).year
  const stamp = `${dayOf(startedAt)} ${spelled.hour}:${spelled.minute}`

  return spelled.year === thisYear ? stamp : `${spelled.year}/${stamp}`
}

function recordedRangeOf(
  r: RecordingResponder,
  outcome: RecordingOutcome,
): string {
  const startedAt = new Date(r.startedAt)
  const spelled = jst(startedAt)
  const from = `${spelled.year}/${dayOf(startedAt)} ${spelled.hour}:${spelled.minute}`

  if (outcome === 'recording') {
    return `${from} — 進行中`
  }

  const ended = r.stoppedAt ?? r.expectedWindow.end

  return `${from} — ${clockOf(new Date(ended))}`
}

function observedLabelOf(
  d: DetailResponder,
  outcome: RecordingOutcome,
): string | undefined {
  if (!d.reconciliation.observedAt) {
    return undefined
  }

  const at = new Date(d.reconciliation.observedAt)
  const spelled = jst(at)

  return outcome === 'recording'
    ? `観測 ${clockOf(at)}`
    : `観測 ${spelled.month}/${spelled.day} ${clockOf(at)}`
}
