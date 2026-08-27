import { cache } from 'react'

import { formatBytes, formatLength } from '@/lib/format'
import { RECORDING_STATE_FILTERS } from '@/lib/recordings'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import { toInt } from '@/repository/programmes'
import { fetchServiceChannels } from '@/repository/programs'
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
export type QualityLevel = 'good' | 'warn' | 'danger'
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
  /** Unset: nothing upstream carries an encoding state yet. */
  encode?: RecordingEncode
  thumbnail: ThumbnailState
  thumbnailLabel?: string
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
      return r.quality.level === 'warn' || r.quality.level === 'danger'
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
export interface QualitySpot {
  at: string
  packets: string
}

export interface SeekMarks {
  playedPct: number
  time: string
  cmSpans?: { leftPct: number; widthPct: number }[]
  chapterPcts?: number[]
  dropPcts?: number[]
}

export interface RecordingDetail extends Recording {
  channelNo?: string
  /** The recording's own snapshot of its programme carries no genre. */
  genres?: string[]
  /** Unset: nothing upstream describes the video or the audio. */
  avInfo?: string
  synopsis?: string
  outcomeBody?: string
  outcomeAxis?: string
  reconcile?: { main: string; sub: string }
  interruptions?: { main: string; sub?: string }
  tunerUnit?: { main: string; sub?: string }
  eoverflow?: string
  scramble?: { main: string; sub?: string }
  stopReason?: string
  failureReason?: { title: string; body: string }
  thumbnailState?: { main: string; sub?: string; canGenerate?: boolean }
  qualityRatio?: string
  qualityTotal?: string
  qualitySpots?: QualitySpot[]
  /** Unset: nothing has been played, so there is no position to draw. */
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
  409: 'この録画はまだ書き込み中です。サムネイルは録画が終わってから作ります。',
  503: '録画ファイルかサムネイルの保存先に手が届かないため、生成できませんでした。',
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

  return {
    id: r.id,
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
    thumbnail: thumbnail.state,
    thumbnailLabel: thumbnail.label,
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
    outcomeAxis:
      base.outcome === 'recording'
        ? undefined
        : '結果は品質(ドロップ)とは別の軸',
    reconcile: reconcileOf(d, base),
    interruptions: {
      main: `中断 ${d.interruptions.length} 回 / 再開 ${toInt(r.resumeCount)} 回`,
      sub: '追記再開のため、繋ぎ目の有無はここで確認します',
    },
    tunerUnit: r.tunerDeviceId ? { main: r.tunerDeviceId } : undefined,
    eoverflow: `${grouped(toInt(r.drops.eovfCount))} 件`,
    scramble:
      scrambled == null
        ? undefined
        : {
            main: `${grouped(scrambled)} パケット`,
            sub: 'サイズが正しいのに再生できない場合はここを見ます',
          },
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
  if (!r.drops.ccMeasured) {
    return {
      measured: false,
      detail: outcome === 'recording' ? '録画の完了時に確定します' : undefined,
    }
  }

  const dropped = counted(r.drops.ccDroppedPackets) ?? 0
  const total = counted(r.drops.ccTotalPackets) ?? 0

  return {
    measured: true,
    level: levelOf(ratioOf(dropped, total)),
    detail: `ドロップ ${grouped(dropped)}`,
  }
}

const WARN_ABOVE_PERCENT = 0.02

const DANGER_ABOVE_PERCENT = 0.1

function ratioOf(dropped: number, total: number): number {
  return total === 0 ? 0 : (dropped / total) * 100
}

function levelOf(percent: number): QualityLevel {
  if (percent > DANGER_ABOVE_PERCENT) {
    return 'danger'
  }

  return percent > WARN_ABOVE_PERCENT ? 'warn' : 'good'
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
  pending: {
    main: '未生成',
    sub: 'まだ作られていません',
    canGenerate: true,
  },
  failed: {
    main: '生成失敗',
    sub: 'サムネイルが無いことは録画の失敗ではありません',
    canGenerate: true,
  },
  skipped: {
    main: 'failed のため作らなかった',
    sub: '失敗した録画にはサムネイルを作りません',
  },
}

const STOPS: Partial<Record<Fault, string>> = {
  stoppedByHand: '手動停止',
  tunerContended: '競合により落とされた',
  drainGraceExpired: 'grace 上限',
  driverLost: 'driver 消失',
}

const FAILURES: Partial<Record<Fault, { title: string; body: string }>> = {
  tuneFailed: {
    title: '選局失敗',
    body: '4分類で残します。① lock しない ② lock したが dvr 無データ ③ PSI 不完全 ④ 期待 TSID / サービス不一致。',
  },
  diskExhausted: {
    title: 'ENOSPC(書き込み中にディスクが尽きた)',
    body: 'その時点までの実績を録画の記録に残して停止しました。リトライで切れ端を量産しません。',
  },
  refusedByDiskPrecheck: {
    title: 'ディスク不足で開始せず',
    body: '開始前の事前チェックで不足を検出しました。警告のみで、自動削除は行いません。',
  },
  scramblingUnresolved: {
    title: 'スクランブル解除失敗',
    body: '閾値を超えた残存パケットを検出しました。サイズが正しいのに全編再生できない場合の唯一の手がかりです。',
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
  failure: { title: string; body: string },
  fault: Fault | undefined,
  detail: FaultResponder[],
): string {
  if (fault !== 'tuneFailed') {
    return failure.body
  }

  const kind = detail.find((one) => one.fault === 'tuneFailed')?.tuneFailure

  return kind ? `${failure.body}今回は ${TUNE_FAILURES[kind]}。` : failure.body
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

  return `期待ウィンドウ ${window}に対し、書けた尺 ${written}・実ファイル ${formatBytes(base.sizeBytes)}。突き合わせの内訳は「録画の記録」にあります。`
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
    sub: `書けた尺 ${written} / 実効ウィンドウ ${window} · 被覆率 ${coverage}%(判定の許容差は暫定値)`,
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
