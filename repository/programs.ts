import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import type { Channel, ChannelKind } from '@/repository/channels'
import type { Programme } from '@/repository/programmes'
import { fetchGuide, fetchProgramme } from '@/repository/programmes'

type TuneSystem = components['schemas']['TuneSystem']

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
  | 'other'

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

export interface ProgramDetail {
  program: Program
  day: GuideDay
  channel?: Channel
}

/** 放送日は 4:00 で切り替わる。 */
const DAY_STARTS_AT_HOUR = 4

const WINDOW_HOURS = 24

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

const PAST_DAYS = 7

const FUTURE_DAYS = 7

const SYSTEM_OF_KIND: Record<ChannelKind, TuneSystem> = {
  terrestrial: 'isdbT',
  bs: 'isdbSBs',
  cs110: 'isdbSCs110',
}

const GENRES: Record<number, { slug: Genre; label: string }> = {
  0: { slug: 'news', label: 'ニュース/報道' },
  1: { slug: 'sports', label: 'スポーツ' },
  2: { slug: 'info', label: '情報/ワイドショー' },
  3: { slug: 'drama', label: 'ドラマ' },
  4: { slug: 'music', label: '音楽' },
  5: { slug: 'variety', label: 'バラエティ' },
  6: { slug: 'movie', label: '映画' },
  7: { slug: 'anime', label: 'アニメ/特撮' },
  8: { slug: 'doc', label: 'ドキュメンタリー/教養' },
  9: { slug: 'other', label: '劇場/公演' },
  10: { slug: 'other', label: '趣味/教育' },
  11: { slug: 'other', label: '福祉' },
}

const GENRE_OTHER: { slug: Genre; label: string } = {
  slug: 'other',
  label: 'その他',
}

interface GuideChannel extends Channel {
  networkId: number
  serviceId: number
  sortKey: [number, number, number]
}

export async function getGuide(
  rawKind: string | undefined,
  rawDate: string | undefined,
): Promise<GuideResult> {
  const kind: ChannelKind =
    rawKind === 'bs' || rawKind === 'cs110' ? rawKind : 'terrestrial'
  const days = guideDays()
  const day =
    days.find((d) => d.date === rawDate) ??
    days.find((d) => d.isToday) ??
    days[0]
  const windowStart = windowStartOf(day.date)
  const windowEnd = new Date(
    windowStart.getTime() + WINDOW_HOURS * 60 * 60 * 1000,
  )

  const [channels, guide] = await Promise.all([
    fetchGuideChannels(kind),
    fetchGuide({
      type: SYSTEM_OF_KIND[kind],
      from: windowStart,
      to: windowEnd,
    }),
  ])

  const programs = guide.programmes
    .filter((programme) => !programme.isShadow)
    .map((programme) => toProgram(programme, windowStart))
    .filter((program): program is Program => program !== null)
  const shown = withSubChannelsSettled(channels, programs)

  const now = Date.now()
  const inWindow = now >= windowStart.getTime() && now < windowEnd.getTime()

  return {
    kind,
    day,
    days,
    windowStartHour: DAY_STARTS_AT_HOUR,
    windowHours: WINDOW_HOURS,
    nowMin: inWindow
      ? Math.floor((now - windowStart.getTime()) / 60_000)
      : undefined,
    nowLabel: inWindow ? clockLabel(new Date(now)) : undefined,
    channels: shown,
    programs: programs.filter((program) =>
      shown.some((channel) => channel.id === program.channelId),
    ),
  }
}

export async function getProgram(
  id: string,
): Promise<ProgramDetail | undefined> {
  const programme = await fetchProgramme(id)

  if (!programme) {
    return undefined
  }

  const day = dayOf(new Date(programme.startsAt))
  const windowStart = windowStartOf(day.date)
  const program = toProgram(programme, windowStart)

  if (!program) {
    return undefined
  }

  const channels = await fetchGuideChannels(kindOfNetwork(programme.networkId))

  return {
    program,
    day,
    channel: channels.find((channel) => channel.id === program.channelId),
  }
}

async function fetchGuideChannels(kind: ChannelKind): Promise<GuideChannel[]> {
  const { data } = await carinaClient().GET('/api/services')

  const rows = (data?.data ?? [])
    .filter((service) => service.category === 'television')
    .filter(
      (service) => service.selectedChannel?.system === SYSTEM_OF_KIND[kind],
    )
    .map((service) => {
      const networkId = toInt(service.networkId)
      const serviceId = toInt(service.serviceId)
      const remoteKey =
        service.remoteControlKeyId == null
          ? undefined
          : toInt(service.remoteControlKeyId)

      return {
        id: `${networkId}-${serviceId}`,
        no: String(remoteKey ?? serviceId),
        name: service.name ?? '',
        kind,
        networkId,
        serviceId,
        sortKey: [remoteKey ?? 99, networkId, serviceId] as [
          number,
          number,
          number,
        ],
      }
    })

  rows.sort(
    (a, b) =>
      a.sortKey[0] - b.sortKey[0] ||
      a.sortKey[1] - b.sortKey[1] ||
      a.sortKey[2] - b.sortKey[2],
  )

  return rows
}

/**
 * 同じネットワークの2本目以降はサブチャンネル。主と別の番組を流している
 * 時間帯がある日だけ列を出す。
 */
function withSubChannelsSettled(
  channels: GuideChannel[],
  programs: Program[],
): Channel[] {
  const primaries = new Map<number, GuideChannel>()
  const shown: Channel[] = []

  for (const channel of channels) {
    const primary = primaries.get(channel.networkId)

    if (!primary) {
      primaries.set(channel.networkId, channel)
      shown.push({ ...channel })

      continue
    }

    const primarySlots = new Set(
      programs
        .filter((program) => program.channelId === primary.id)
        .map((program) => `${program.startMin}:${program.title}`),
    )
    const differs = programs.some(
      (program) =>
        program.channelId === channel.id &&
        !primarySlots.has(`${program.startMin}:${program.title}`),
    )

    if (differs) {
      shown.push({ ...channel, sub: true })
    }
  }

  return shown
}

function toProgram(programme: Programme, windowStart: Date): Program | null {
  const startsAt = new Date(programme.startsAt)
  const endsAt = programme.endsAt ? new Date(programme.endsAt) : undefined
  const windowEnd = windowStart.getTime() + WINDOW_HOURS * 60 * 60 * 1000

  const shownFrom = Math.max(startsAt.getTime(), windowStart.getTime())
  const shownTo = Math.min(endsAt?.getTime() ?? windowEnd, windowEnd)

  if (shownTo <= shownFrom) {
    return null
  }

  const genreKind = programme.genres[0]?.kind
  const genre =
    (genreKind != null ? GENRES[genreKind] : undefined) ?? GENRE_OTHER

  return {
    id: programme.id,
    channelId: `${programme.networkId}-${programme.serviceId}`,
    title: programme.name,
    description: programme.summary || undefined,
    detail:
      programme.items.length > 0
        ? programme.items
            .map((item) =>
              item.heading ? `${item.heading}\n${item.text}` : item.text,
            )
            .join('\n\n')
        : undefined,
    genre: genre.slug,
    genreLabel: genre.label,
    startMin: Math.floor((shownFrom - windowStart.getTime()) / 60_000),
    durationMin: Math.ceil((shownTo - shownFrom) / 60_000),
    startLabel: clockLabel(startsAt),
    endLabel: endsAt ? clockLabel(endsAt) : '未定',
    subtitled: programme.hasSubtitles || undefined,
    endUndecided: endsAt ? undefined : true,
  }
}

function guideDays(): GuideDay[] {
  const today = dayOf(new Date())
  const days: GuideDay[] = []

  for (let offset = -PAST_DAYS; offset <= FUTURE_DAYS; offset++) {
    const date = shiftDate(today.date, offset)

    days.push({
      date,
      label: dayLabel(date),
      isToday: offset === 0,
    })
  }

  return days
}

function dayOf(at: Date): GuideDay {
  const jst = new Date(
    at.getTime() + JST_OFFSET_MS - DAY_STARTS_AT_HOUR * 60 * 60 * 1000,
  )
  const date = jst.toISOString().slice(0, 10)

  return { date, label: dayLabel(date), isToday: false }
}

function windowStartOf(date: string): Date {
  return new Date(
    new Date(`${date}T00:00:00Z`).getTime() +
      DAY_STARTS_AT_HOUR * 60 * 60 * 1000 -
      JST_OFFSET_MS,
  )
}

function shiftDate(date: string, days: number): string {
  const shifted = new Date(
    new Date(`${date}T00:00:00Z`).getTime() + days * 24 * 60 * 60 * 1000,
  )

  return shifted.toISOString().slice(0, 10)
}

const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土']

function dayLabel(date: string): string {
  const at = new Date(`${date}T00:00:00Z`)

  return `${at.getUTCMonth() + 1}/${at.getUTCDate()}(${WEEKDAY[at.getUTCDay()]})`
}

function clockLabel(at: Date): string {
  const jst = new Date(at.getTime() + JST_OFFSET_MS)

  return `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`
}

function kindOfNetwork(networkId: number): ChannelKind {
  if (networkId === 4) {
    return 'bs'
  }

  if (networkId === 6 || networkId === 7) {
    return 'cs110'
  }

  return 'terrestrial'
}

function toInt(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}
