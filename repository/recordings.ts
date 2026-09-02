import { cache } from 'react'

import { formatBytes, formatLength } from '@/lib/format'
import { RECORDING_STATE_FILTERS } from '@/lib/recordings'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import { toInt } from '@/repository/programmes'
import { fetchServiceChannels } from '@/repository/programs'
import { videoThumbnailHref } from '@/repository/video-paths'
import type { GuideChannel } from '@/repository/programs'

type RecordingResponder = components['schemas']['RecordingResponder']
type DetailResponder = components['schemas']['RecordingDetailResponder']
type FaultResponder = components['schemas']['RecordingFaultResponder']
type Fault = components['schemas']['RecordingFault']
type TuneFailure = NonNullable<components['schemas']['TuneFailureKind']>
type DropBucket = components['schemas']['DropBucketResponder']
type Counted = number | string
type Countable = Counted | null

export type RecordingOutcome = 'recording' | 'complete' | 'truncated' | 'failed'

/**
 * How a recording reads as something to watch. The API grades it, weighing the
 * packets lost against the packets left scrambled and keeping whichever is
 * worse, so the level is taken from there rather than counted again here: a
 * reading made from the dropped packets alone calls a recording that never
 * descrambled good.
 */
export type QualityLevel = Exclude<
  components['schemas']['QualityLevel'],
  'unmeasured'
>
export type EncodeStatus = 'none' | 'waiting' | 'running' | 'done' | 'failed'
export type ThumbnailState = 'shot' | 'pending' | 'none' | 'error'

export interface RecordingQuality {
  measured: boolean
  level?: QualityLevel
  detail?: string
}

export interface RecordingEncode {
  status: EncodeStatus
  progress?: number
  reason?: string
}

export interface Recording {
  id: string
  /** The reservation this recording was made for, where it was made for one. */
  reservationId?: string
  title: string
  note?: string
  description?: string
  cast?: string[]
  segments?: number
  channel: string
  /** The recording's own snapshot of its programme carries no genre. */
  genre?: string
  year: number
  startedAt: string
  recordedAtLabel: string
  recordedAtNote?: string
  recordedRange: string
  lengthSec?: number
  expectedLengthSec?: number
  /** Unset while the size has not been observed, which is only mid-recording. */
  sizeBytes?: number
  sizeObservedAt?: string
  filePath: string
  fileMissing?: boolean
  outcome: RecordingOutcome
  outcomeDetail?: string
  quality: RecordingQuality
  /**
   * The share of the recording's packets that were still scrambled when it was
   * written, as a fraction of the packets counted. Unset where nothing counted
   * them. A picture cannot be built out of packets that were never descrambled,
   * so this is what tells a failed playback apart from one that would come back
   * on its own — and what keeps the library from offering a way to it.
   */
  scrambledShare?: number
  /** Unset: nothing upstream carries an encoding state yet. */
  encode?: RecordingEncode
  thumbnail: ThumbnailState
  thumbnailLabel?: string
  /** Where the drawn picture is. Unset until one has been drawn. */
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
  const all = carried.items.map((one) => toRecording(one, known, now))
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
/**
 * The recording each reservation came to, by reservation. A reservation with
 * no recording is absent rather than held with nothing against it, which is
 * how the reservation screen tells the two apart.
 */
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

export interface QualitySpot {
  at: string
  packets: string
  /** Seconds from the start of the recording, which is where playing resumes. */
  second: number
}

/**
 * The marks drawn along the bar that are not read off the recording itself.
 * Where the playhead is, and where the drops fell, are known from the picture
 * and from the counters; a chapter is neither, and nothing upstream carries
 * one yet.
 */
export interface SeekMarks {
  cmSpans?: { leftPct: number; widthPct: number }[]
  chapterPcts?: number[]
}

export interface RecordingDetail extends Recording {
  channelNo?: string
  /** The recording's own snapshot of its programme carries no genre. */
  genres?: string[]
  /** Unset: nothing upstream describes the video or the audio. */
  avInfo?: string
  synopsis?: string
  outcomeBody?: string
  reconcile?: { main: string; sub: string }
  interruptions?: { main: string }
  tunerUnit?: { main: string; sub?: string }
  eoverflow?: string
  scramble?: { main: string }
  stopReason?: string
  failureReason?: { title: string; body?: string }
  thumbnailState?: { main: string; sub?: string; canGenerate?: boolean }
  qualityRatio?: string
  qualityTotal?: string
  qualitySpots?: QualitySpot[]
  /** Unset: nothing upstream carries a chapter or a commercial break. */
  seek?: SeekMarks
  /** Unset: nothing upstream carries an encoding state yet. */
  encodePanel?: {
    profile?: string
    doneSub?: string
    sourceSize?: string
    outSize?: string
    savings?: string
    queueSub?: string
    registeredAt?: string
    progressPct?: number
    progressSub?: string
    attempts?: string
  }
  live?: {
    elapsed: string
    written: string
    drops: string
    rest: string
    updatedAt: string
    extension?: {
      plannedEnd: string
      currentEnd: string
      delta: string
      followedAt: string
    }
  }
}

export const getRecording = cache(
  async (id: string): Promise<RecordingDetail | undefined> => {
    const { data, response } = await carinaClient().GET(
      '/api/recordings/{id}',
      {
        params: { path: { id } },
      },
    )

    if (response.status === 404 || response.status === 400) {
      return undefined
    }

    if (!data?.data) {
      throw new Error(data?.message || '録画を読めませんでした')
    }

    const known = await fetchServiceChannels()

    return toDetail(data.data, known, new Date())
  },
)

export type ThumbnailRemake = components['schemas']['ThumbnailRemake']

/**
 * What asking for a picture came to. A 200 is not always a picture: the pass
 * answers `skipped` for a recording it will not illustrate and `failed` for
 * one it could not, and neither is a refusal of the request.
 */
export type ThumbnailWrite =
  | { state: 'ok'; remake: ThumbnailRemake }
  | { state: 'rejected'; message: string }

const THUMBNAIL_REFUSAL: Partial<Record<number, string>> = {
  400: 'この録画の指定が正しくないため、サムネイルを生成できませんでした。',
  404: 'この録画は残っていないため、サムネイルを生成できませんでした。',
  409: 'この録画はまだ書き込み中です。サムネイルは録画の完了後に生成されます。',
  503: '録画ファイルかサムネイルの保存先に到達できないため、生成できませんでした。',
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
      `サムネイルを生成できませんでした(${response.status})。`,
  }
}

type RecordingRefusal = components['schemas']['RecordingFailure']

type RecordingDiscardRefused =
  components['schemas']['RecordingDiscardRefusedResponder']

/**
 * What throwing a recording away came to. `filesRemoved` counts the files that
 * went with it, which is nothing when the ledger row outlived files that were
 * already gone.
 */
export type RecordingDiscarded =
  | { state: 'ok'; filesRemoved: number }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

/**
 * Each way the API refuses, said in the words of that refusal. The reasons
 * separate what is still being written from what the store cannot be reached
 * for and from a removal that stopped part-way, and those three ask different
 * things of the reader, so none of them is folded into the others.
 */
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
}

const CANNOT_DISCARD = '録画を削除できませんでした'

/**
 * Throws the recording away: the files first and the ledger row last, which is
 * the API's own order and is why a refusal part-way leaves the row standing.
 */
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

  // A refusal arrives as `error`, not as `data`: the generated client hands
  // back the parsed body under whichever of the two the status calls for.
  const refused = error?.data as RecordingDiscardRefused | null | undefined

  return {
    state: 'rejected',
    message: refused
      ? DISCARD_REFUSAL[refused.refusal]
      : `${CANNOT_DISCARD}(${response.status})。`,
  }
}

/**
 * The store answers a page at a time and caps the page at 200, while the
 * screen lists everything it is given and says so. Walking to the last page
 * the store names is what keeps that sentence true.
 */
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
      throw new Error(data?.message || '録画を読めませんでした')
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

  return {
    id: r.id,
    reservationId: r.reservationId ?? undefined,
    title: r.programme.name,
    description: r.programme.summary || undefined,
    channel: channel?.name || serviceKeyOf(r),
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
  const channel = channelOf(r, known)
  const fault = leadingFault(r.outcomeDetail)
  const failure = fault ? FAILURES[fault] : undefined
  const measured = r.drops.ccMeasured
  const dropped = counted(r.drops.ccDroppedPackets) ?? 0
  const totalPackets = counted(r.drops.ccTotalPackets) ?? 0
  const scrambled = counted(r.drops.scrambledPackets)

  return {
    ...base,
    channelNo: channel?.no,
    sizeObservedAt: observedLabelOf(d, base.outcome),
    synopsis: r.programme.summary || undefined,
    outcomeBody: outcomeBodyOf(r, base),
    reconcile: reconcileOf(d, base),
    interruptions: {
      main: `中断 ${d.interruptions.length} 回 / 再開 ${toInt(r.resumeCount)} 回`,
    },
    tunerUnit: r.tunerDeviceId ? { main: r.tunerDeviceId } : undefined,
    eoverflow: `${grouped(toInt(r.drops.eovfCount))} 件`,
    scramble:
      scrambled == null
        ? undefined
        : { main: `${grouped(scrambled)} パケット` },
    stopReason: stopReasonOf(d),
    failureReason:
      base.outcome === 'failed' && failure
        ? {
            title: failure.title,
            body: bodyOf(failure, fault, r.outcomeDetail),
          }
        : undefined,
    thumbnailState: THUMBNAIL_ROWS[r.thumbnail.state],
    qualityTotal: measured ? grouped(dropped) : undefined,
    qualityRatio: measured
      ? ratioOf(dropped, totalPackets).toFixed(4)
      : undefined,
    qualitySpots: spotsOf(d.positions.buckets, new Date(r.startedAt)),
    live: base.outcome === 'recording' ? liveOf(d, base, now) : undefined,
  }
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

/**
 * A recording still being written has no outcome yet, and the store says so by
 * leaving it unsaid rather than by naming a fourth one.
 */
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
    // Both readings, because either can be what decided the level, and a
    // recording graded on its scrambled packets under a line that counts only
    // the dropped ones reads as a badge with nothing behind it.
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

function thumbnailOf(r: RecordingResponder) {
  return THUMBNAILS[r.thumbnail.state]
}

const THUMBNAIL_ROWS: Record<
  components['schemas']['ThumbnailState'],
  { main: string; sub?: string; canGenerate?: boolean }
> = {
  ready: { main: '生成済み' },
  pending: { main: '未生成', canGenerate: true },
  failed: { main: '生成失敗', canGenerate: true },
  skipped: { main: 'failed のため生成されず' },
}

const STOPS: Partial<Record<Fault, string>> = {
  stoppedByHand: '手動停止',
  tunerContended: '競合により落とされた',
  drainGraceExpired: 'grace 上限',
  driverLost: 'driver 消失',
}

const FAILURES: Partial<Record<Fault, { title: string; body?: string }>> = {
  tuneFailed: { title: '選局失敗' },
  diskExhausted: {
    title: 'ENOSPC(書き込み中にディスクが尽きた)',
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
}

const TUNE_FAILURES: Record<TuneFailure, string> = {
  noLock: '① lock しない',
  noData: '② lock したが dvr 無データ',
  incompletePsi: '③ PSI 不完全',
  streamMismatch: '④ 期待 TSID / サービス不一致',
}

function leadingFault(detail: FaultResponder[]): Fault | undefined {
  return detail.find((one) => FAILURES[one.fault])?.fault
}

function faultTitleOf(detail: FaultResponder[]): string | undefined {
  const fault = leadingFault(detail)

  return fault ? FAILURES[fault]?.title : undefined
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

  return kind ? TUNE_FAILURES[kind] : undefined
}

function stopReasonOf(d: DetailResponder): string | undefined {
  const named = d.recording.outcomeDetail.find((one) => STOPS[one.fault])

  if (named) {
    return STOPS[named.fault]
  }

  return d.recording.abortedAt ? '自分の abort(終了時刻に到達)' : undefined
}

function outcomeBodyOf(
  r: RecordingResponder,
  base: Recording,
): string | undefined {
  if (base.outcome === 'recording' || base.sizeBytes == null) {
    return undefined
  }

  const window = spanLabel(toInt(r.expectedWindow.durationMs))
  const written = spanLabel(toInt(r.writtenDurationMs))

  return `期待ウィンドウ ${window}に対し、書けた尺 ${written}・実ファイル ${formatBytes(base.sizeBytes)}。`
}

function reconcileOf(
  d: DetailResponder,
  base: Recording,
): { main: string; sub: string } | undefined {
  if (!d.reconciliation.sizeObserved || base.sizeBytes == null) {
    return undefined
  }

  const written = formatLength(
    Math.round(toInt(d.reconciliation.writtenDurationMs) / 1000),
  )
  const window = formatLength(
    Math.round(toInt(d.reconciliation.expectedWindow.durationMs) / 1000),
  )
  const coverage = (Number(d.reconciliation.coverage) * 100).toFixed(1)

  return {
    main: formatBytes(base.sizeBytes),
    sub: `書けた尺 ${written} / 実効ウィンドウ ${window} · 被覆率 ${coverage}%`,
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

/**
 * The buckets the store keeps are one second wide, and the screen names a spot
 * by the minute it fell in, so the seconds of one minute are one spot.
 */
export function spotsOf(buckets: DropBucket[], startedAt: Date): QualitySpot[] {
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
      at: `${clockOf(new Date(startedAt.getTime() + minute * 60_000))} 付近`,
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

/** `1時間54分`, the way the outcome banner spells a span. */
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

function clockWithSeconds(at: Date): string {
  const spelled = jst(at)

  return `${spelled.hour}:${spelled.minute}:${spelled.second}`
}

/**
 * `08/10(日) 23:15`, and the year in front of it once the recording is old
 * enough that the day alone would place it in the wrong one.
 */
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

/**
 * When the size was seen. Only the recording asked for by itself answers with
 * it — the list carries the size alone — so a row of the list leaves it unsaid
 * rather than putting the recording's own clock in its place.
 */
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
