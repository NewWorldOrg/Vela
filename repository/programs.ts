import { CHANNELS, type ChannelKind } from '@/repository/channels'
import { PROGRAM_FIXTURES } from '@/repository/programs.fixtures'

export type Genre =
  | 'news'
  | 'sports'
  | 'info'
  | 'drama'
  | 'music'
  | 'variety'
  | 'movie'
  | 'anime'
  | 'doc'

export interface Program {
  id: string
  channelId: string
  title: string
  description?: string
  detail?: string
  cast?: string[]
  genre: Genre
  genreLabel: string
  /** 番組表の窓の開始からの分 */
  startMin: number
  durationMin: number
  startLabel: string
  endLabel: string
  subtitled?: boolean
  booked?: boolean
  endUndecided?: boolean
}

export interface GuideDay {
  date: string
  label: string
  isToday: boolean
}

export interface GuideResult {
  kind: ChannelKind
  day: GuideDay
  windowStartHour: number
  windowHours: number
  nowMin?: number
  nowLabel?: string
  channels: typeof CHANNELS
  programs: Program[]
  coverageWarning?: { kind: string; body: string }
}

export const GUIDE_DAYS: GuideDay[] = [
  { date: '2026-08-07', label: '8/7(木)', isToday: false },
  { date: '2026-08-08', label: '8/8(金)', isToday: true },
  { date: '2026-08-09', label: '8/9(土)', isToday: false },
]

export async function getGuide(
  rawKind: string | undefined,
  rawDate: string | undefined,
): Promise<GuideResult> {
  const kind: ChannelKind =
    rawKind === 'bs' || rawKind === 'cs110' ? rawKind : 'terrestrial'
  const day =
    GUIDE_DAYS.find((d) => d.date === rawDate) ??
    GUIDE_DAYS.find((d) => d.isToday) ??
    GUIDE_DAYS[0]

  const channels = CHANNELS.filter((c) => c.kind === kind)
  const programs = kind === 'terrestrial' ? PROGRAM_FIXTURES : []

  return {
    kind,
    day,
    windowStartHour: 19,
    windowHours: 8,
    nowMin: day.isToday ? 124 : undefined,
    nowLabel: day.isToday ? '21:04' : undefined,
    channels,
    programs,
    coverageWarning:
      kind === 'bs'
        ? {
            kind: 'BS',
            body: 'BS の番組情報が不足しています(カバレッジ 0 日)。チャンネル設定を確認してください。',
          }
        : undefined,
  }
}

export async function getProgram(id: string): Promise<Program | undefined> {
  return PROGRAM_FIXTURES.find((p) => p.id === id)
}
