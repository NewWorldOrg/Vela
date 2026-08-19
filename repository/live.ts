import { CHANNEL_FIXTURES } from '@/repository/channels.fixtures'
import {
  NOW_LABEL,
  NOW_MIN,
  PROGRAM_FIXTURES,
} from '@/repository/programs.fixtures'

export interface LiveChannelRow {
  id: string
  no: string
  name: string
  now: string
  next: string
  onAir: boolean
}

export interface LiveResult {
  channelId: string
  channelNo: string
  channelName: string
  title: string
  timeLabel: string
  progressPct: number
  nowLabel: string
  restLabel: string
  description?: string
  chips: string[]
  latencySec: number
  drops: number
  rows: LiveChannelRow[]
}

export const LIVE_QUALITIES = [
  '1080p 6.0 Mbps',
  '720p 3.0 Mbps',
  '480p 1.5 Mbps',
]

export async function getLive(rawChannel?: string): Promise<LiveResult> {
  const channel =
    CHANNEL_FIXTURES.find((c) => c.id === rawChannel && !c.sub) ??
    CHANNEL_FIXTURES.find((c) => !c.sub)!

  const onAirOf = (channelId: string) =>
    PROGRAM_FIXTURES.filter((p) => p.channelId === channelId).find(
      (p) => p.startMin <= NOW_MIN && p.startMin + p.durationMin > NOW_MIN,
    )
  const nextOf = (channelId: string) =>
    PROGRAM_FIXTURES.filter(
      (p) => p.channelId === channelId && p.startMin > NOW_MIN,
    ).sort((a, b) => a.startMin - b.startMin)[0]

  const current = onAirOf(channel.id)
  const elapsed = current ? NOW_MIN - current.startMin : 0
  const rest = current ? current.durationMin - elapsed : 0

  return {
    channelId: channel.id,
    channelNo: channel.no ?? '',
    channelName: channel.name,
    title: current?.title ?? '番組情報がありません',
    timeLabel: current ? `${current.startLabel} – ${current.endLabel}` : '—',
    progressPct: current
      ? Math.round((elapsed / current.durationMin) * 100)
      : 0,
    nowLabel: NOW_LABEL,
    restLabel: `残り ${rest} 分`,
    description: current?.description,
    chips: [
      ...(current?.subtitled ? ['字幕あり'] : []),
      ...(current ? [current.genreLabel] : []),
      '1080i',
      'ステレオ(日本語)',
    ],
    latencySec: 1.8,
    drops: 18,
    rows: CHANNEL_FIXTURES.filter((c) => !c.sub).map((c) => {
      const now = onAirOf(c.id)
      const next = nextOf(c.id)
      return {
        id: c.id,
        no: c.no ?? '',
        name: c.name,
        now: now?.title ?? '番組情報がありません',
        next: next ? `次 ${next.startLabel} ${next.title}` : '次の番組は未取得',
        onAir: c.id === channel.id,
      }
    }),
  }
}
