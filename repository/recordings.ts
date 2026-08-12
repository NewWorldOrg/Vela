import { RECORDING_FIXTURES } from '@/repository/recordings.fixtures'

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
  genre: string
  year: number
  startedAt: string
  recordedAtLabel: string
  recordedAtNote?: string
  recordedRange: string
  lengthSec?: number
  expectedLengthSec?: number
  sizeBytes: number
  sizeObservedAt: string
  filePath: string
  fileMissing?: boolean
  outcome: RecordingOutcome
  outcomeDetail?: string
  quality: RecordingQuality
  encode: RecordingEncode
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

export const RECORDING_STATE_FILTERS = [
  '問題のある録画',
  '尻切れ・失敗',
  '未計測',
] as const

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
  const all = [...RECORDING_FIXTURES].sort(
    (a, b) =>
      (b.startedAt ?? '').localeCompare(a.startedAt ?? '') ||
      b.id.localeCompare(a.id, undefined, { numeric: true }),
  )
  const channels = [...new Set(all.map((r) => r.channel))]
  const years = [...new Set(all.map((r) => r.year))].sort((a, b) => b - a)
  const genres = [...new Set(all.map((r) => r.genre))]
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
    if (tokens.length > 0 && !matchesQuery(r, tokens)) return false
    if (filter.year && String(r.year) !== filter.year) return false
    if (filter.genre && r.genre !== filter.genre) return false
    if (filter.state && !matchesState(r, filter.state)) return false
    if (filter.ch && r.channel !== filter.ch) return false
    return true
  })
  return { items, total: all.length, channels, years, genres, filter }
}
