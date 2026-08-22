import type { GuideRelationKind } from '@/lib/guide'
import {
  DAY_STARTS_AT_HOUR,
  JST_OFFSET_MS,
  WINDOW_HOURS,
  broadcastDateOf,
  nowMinOf,
  splitServicesSettled,
  windowStartOf,
} from '@/lib/guide'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import type { Channel, ChannelKind } from '@/repository/channels'
import type { Programme } from '@/repository/programmes'
import { fetchGuide, fetchProgramme, toInt } from '@/repository/programmes'

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
  genre: Genre
  genreLabel: string
  /** 番組表の窓の開始からの分 */
  startMin: number
  durationMin: number
  dateLabel?: string
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
  coverageWarning?: { emphasis: string; body: string }
}

export interface ProgramItem {
  heading: string
  text: string
}

export type RelationKind = GuideRelationKind

export interface RelatedProgram {
  key: string
  kind: RelationKind
  channelLabel?: string
}

export interface ProgramDetail {
  program: Program
  day: GuideDay
  channel?: Channel
  items: ProgramItem[]
  related: RelatedProgram[]
  durationLabel?: string
}

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

const UNDECIDED_DURATION_MIN = 30

export interface GuideChannel extends Channel {
  networkId: number
  serviceId: number
  sortKey: [number, number, number]
}

const KIND_OF_SYSTEM: Partial<Record<TuneSystem, ChannelKind>> = {
  isdbT: 'terrestrial',
  isdbSBs: 'bs',
  isdbSCs110: 'cs110',
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

  const settled = splitServicesSettled(
    channels,
    guide.programmes.filter((programme) => !programme.isShadow),
  )

  const now = new Date()
  const nowMin = nowMinOf(now, windowStart)

  return {
    kind,
    day,
    days,
    windowStartHour: DAY_STARTS_AT_HOUR,
    windowHours: WINDOW_HOURS,
    nowMin,
    nowLabel: nowMin === undefined ? undefined : clockLabel(now),
    channels: settled.services.map(({ service, sub }) =>
      sub ? { ...service, sub } : { ...service },
    ),
    programs: settled.broadcasts
      .map((programme) => toProgram(programme, windowStart))
      .filter((program): program is Program => program !== null),
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

  const channels = await fetchServiceChannels()
  const channelOf = (
    networkId: number,
    serviceId: number,
  ): GuideChannel | undefined =>
    channels.find(
      (channel) =>
        channel.networkId === networkId && channel.serviceId === serviceId,
    )
  const channel = channelOf(programme.networkId, programme.serviceId)

  return {
    program,
    day,
    channel,
    items: programme.items,
    related: withRelatedSettled(
      programme.related.map((related) => ({
        key: `${related.networkId}-${related.serviceId}-${related.eventId}`,
        kind: related.kind,
        channelLabel: channelLabelOf(
          channelOf(related.networkId, related.serviceId),
        ),
      })),
      channel,
    ),
    durationLabel: durationLabelOf(programme),
  }
}

function channelLabelOf(channel: Channel | undefined): string | undefined {
  if (!channel?.name) {
    return undefined
  }

  return [channel.no, channel.name].filter(Boolean).join(' ')
}

export function withRelatedSettled(
  related: RelatedProgram[],
  channel: Channel | undefined,
): RelatedProgram[] {
  const currentLabel = channelLabelOf(channel)
  const settled: RelatedProgram[] = []
  const seen = new Set<string>()

  for (const item of related) {
    if (
      item.kind === 'shared' &&
      currentLabel !== undefined &&
      item.channelLabel === currentLabel
    ) {
      continue
    }

    const identity = `${item.kind}:${item.channelLabel ?? ''}`

    if (seen.has(identity)) {
      continue
    }

    seen.add(identity)
    settled.push(item)
  }

  return settled
}

export async function fetchServiceChannels(): Promise<GuideChannel[]> {
  const { data, error } = await carinaClient().GET('/api/services')

  if (error || !data?.data) {
    throw new Error(data?.message || 'チャンネルを読めませんでした')
  }

  return data.data
    .filter((service) => service.category === 'television')
    .map((service) => {
      const networkId = toInt(service.networkId)
      const serviceId = toInt(service.serviceId)
      const remoteKey =
        service.remoteControlKeyId == null
          ? undefined
          : toInt(service.remoteControlKeyId)
      const target = service.selectedChannel ?? service.candidates[0]?.target
      const system =
        !target || target.system === 'unspecified' ? undefined : target.system
      const kind =
        (system && KIND_OF_SYSTEM[system]) ?? kindOfNetwork(networkId)

      return {
        id: `${networkId}-${serviceId}`,
        no: remoteKey == null ? undefined : String(remoteKey),
        name: service.name ?? '',
        kind,
        networkId,
        serviceId,
        sortKey:
          kind === 'terrestrial'
            ? ([remoteKey ?? serviceId, networkId, serviceId] as [
                number,
                number,
                number,
              ])
            : ([serviceId, networkId, serviceId] as [number, number, number]),
      }
    })
}

async function fetchGuideChannels(kind: ChannelKind): Promise<GuideChannel[]> {
  const rows = (await fetchServiceChannels()).filter(
    (channel) => channel.kind === kind,
  )

  rows.sort(
    (a, b) =>
      a.sortKey[0] - b.sortKey[0] ||
      a.sortKey[1] - b.sortKey[1] ||
      a.sortKey[2] - b.sortKey[2],
  )

  return rows
}

function toProgram(programme: Programme, windowStart: Date): Program | null {
  const startsAt = new Date(programme.startsAt)
  const endsAt = programme.endsAt ? new Date(programme.endsAt) : undefined
  const windowEnd = windowStart.getTime() + WINDOW_HOURS * 60 * 60 * 1000

  const shownFrom = Math.max(startsAt.getTime(), windowStart.getTime())
  const shownTo = Math.min(
    endsAt?.getTime() ?? shownFrom + UNDECIDED_DURATION_MIN * 60_000,
    windowEnd,
  )

  if (shownTo <= shownFrom) {
    return null
  }

  const genre = genreDisplayOf(programme)

  return {
    id: programme.id,
    channelId: `${programme.networkId}-${programme.serviceId}`,
    title: programme.name,
    description: programme.summary || undefined,
    genre: genre.slug,
    genreLabel: genre.label,
    startMin: Math.floor((shownFrom - windowStart.getTime()) / 60_000),
    durationMin: Math.ceil((shownTo - shownFrom) / 60_000),
    dateLabel: dayLabel(calendarDateOf(startsAt)),
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

export function genreDisplayOf(programme: Programme): {
  slug: Genre
  label: string
} {
  const genreKind = programme.genres[0]?.kind

  return (genreKind != null ? GENRES[genreKind] : undefined) ?? GENRE_OTHER
}

export function calendarDateOf(at: Date): string {
  return new Date(at.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10)
}

function dayOf(at: Date): GuideDay {
  const date = broadcastDateOf(at)

  return { date, label: dayLabel(date), isToday: false }
}

function shiftDate(date: string, days: number): string {
  const shifted = new Date(
    new Date(`${date}T00:00:00Z`).getTime() + days * 24 * 60 * 60 * 1000,
  )

  return shifted.toISOString().slice(0, 10)
}

const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土']

export function dayLabel(date: string): string {
  const at = new Date(`${date}T00:00:00Z`)

  return `${at.getUTCMonth() + 1}/${at.getUTCDate()}(${WEEKDAY[at.getUTCDay()]})`
}

function durationLabelOf(programme: Programme): string | undefined {
  if (!programme.endsAt) {
    return undefined
  }

  const minutes = Math.round(
    (new Date(programme.endsAt).getTime() -
      new Date(programme.startsAt).getTime()) /
      60_000,
  )

  if (minutes <= 0) {
    return undefined
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours === 0) {
    return `${rest}分`
  }

  return rest === 0 ? `${hours}時間` : `${hours}時間${rest}分`
}

export function clockLabel(at: Date): string {
  const jst = new Date(at.getTime() + JST_OFFSET_MS)

  return `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`
}

export function kindOfNetwork(networkId: number): ChannelKind {
  if (networkId === 4) {
    return 'bs'
  }

  if (networkId === 6 || networkId === 7) {
    return 'cs110'
  }

  return 'terrestrial'
}
