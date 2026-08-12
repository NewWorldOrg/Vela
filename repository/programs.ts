import type { Channel, ChannelKind } from '@/repository/channels'
import { CHANNEL_FIXTURES } from '@/repository/channels.fixtures'
import {
  GUIDE_DAYS,
  NOW_LABEL,
  NOW_MIN,
  PROGRAM_DAY,
  PROGRAM_FIXTURES,
} from '@/repository/programs.fixtures'

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
  days: GuideDay[]
  windowStartHour: number
  windowHours: number
  nowMin?: number
  nowLabel?: string
  channels: Channel[]
  programs: Program[]
  coverageWarning?: { kind: string; body: string }
}

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

  const channels = CHANNEL_FIXTURES.filter((c) => c.kind === kind)
  const programs =
    kind === 'terrestrial' && day.date === PROGRAM_DAY.date
      ? PROGRAM_FIXTURES
      : []

  return {
    kind,
    day,
    days: GUIDE_DAYS,
    windowStartHour: 19,
    windowHours: 8,
    nowMin: day.isToday ? NOW_MIN : undefined,
    nowLabel: day.isToday ? NOW_LABEL : undefined,
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

export interface ProgramDetail {
  program: Program
  day: GuideDay
  channel?: Channel
}

export async function getProgram(
  id: string,
): Promise<ProgramDetail | undefined> {
  const program = PROGRAM_FIXTURES.find((p) => p.id === id)
  if (!program) {
    return undefined
  }

  return {
    program,
    day: PROGRAM_DAY,
    channel: CHANNEL_FIXTURES.find((c) => c.id === program.channelId),
  }
}
