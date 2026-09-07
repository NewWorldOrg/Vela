import { servicesSettled, type SettledGuide } from '@/lib/guide'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import {
  CHANNEL_KIND_ORDER,
  type ChannelKind,
  type StationLogo,
} from '@/repository/channels'
import type { Programme } from '@/repository/programmes'
import { fetchGuide, toInt } from '@/repository/programmes'
import {
  clockLabel,
  fetchServiceChannels,
  genreDisplayOf,
  kindOfNetwork,
} from '@/repository/programs'
import { whatItSaid } from '@/repository/said'

type LiveChannelResponder = components['schemas']['LiveChannelResponder']
type LiveProfileResponder = components['schemas']['LiveProfileResponder']
type TuneSystem = components['schemas']['TuneSystem']

const KIND_OF_SYSTEM: Partial<Record<TuneSystem, ChannelKind>> = {
  isdbT: 'terrestrial',
  isdbSBs: 'bs',
  isdbSCs110: 'cs110',
}

const SYSTEM_OF_KIND: Record<ChannelKind, TuneSystem> = {
  terrestrial: 'isdbT',
  bs: 'isdbSBs',
  cs110: 'isdbSCs110',
}

const AROUND_NOW_MS = 6 * 60 * 60 * 1000

const UNDECIDED_DURATION_MS = 30 * 60 * 1000

type SettledLineup = SettledGuide<LiveChannel, Programme>

const EVERY_CHANNEL = 200

export interface LiveProgramme {
  id: string
  title: string
  startsAt: string
  endsAt?: string
  startLabel: string
  endLabel?: string
  hasSubtitles: boolean
  genreLabel: string
}

export interface LiveChannel {
  id: string
  networkId: number
  serviceId: number
  name: string
  no?: string
  kind: ChannelKind
  sub?: boolean
  whole?: string
  logo?: StationLogo
  viewers: number
  now?: LiveProgramme
  next?: LiveProgramme
  progressPct?: number
}

export interface LiveProfile {
  name: string
  width: number
  height: number
  unasked: boolean
}

export interface LiveWatching {
  channel: LiveChannel
  progressPct: number
  nowLabel: string
  restMin?: number
}

export interface LiveScreen {
  kind: ChannelKind
  kinds: ChannelKind[]
  channels: LiveChannel[]
  watching?: LiveWatching
  profiles: LiveProfile[]
  tuners?: number
}

export function kindOf(
  rawKind: string | undefined,
  had: ChannelKind[] = [],
): ChannelKind {
  if (rawKind === 'bs' || rawKind === 'cs110' || rawKind === 'terrestrial') {
    return rawKind
  }

  return had[0] ?? 'terrestrial'
}

export async function getLiveScreen(
  rawKind: string | undefined,
  rawChannel: string | undefined,
  now: Date = new Date(),
): Promise<LiveScreen> {
  const [listed, profiles, tuners, known] = await Promise.all([
    fetchLiveChannels(),
    fetchLiveProfiles(),
    countTuners(),
    fetchServiceChannels(),
  ])
  const logos = new Map(known.map((one) => [one.id, one.logo]))
  const kinds = CHANNEL_KIND_ORDER.filter((one) =>
    listed.some((channel) => channel.kind === one),
  )
  const kind = kindOf(rawKind, kinds)
  const chosen = listed.find((channel) => channel.id === rawChannel)

  const read = [...new Set([kind, ...(chosen ? [chosen.kind] : [])])]
  const guides = await Promise.all(
    read.map((one) =>
      fetchGuide({
        type: SYSTEM_OF_KIND[one],
        from: new Date(now.getTime() - AROUND_NOW_MS),
        to: new Date(now.getTime() + AROUND_NOW_MS),
      }),
    ),
  )
  const onAir = guides
    .flatMap((guide) => guide.programmes)
    .filter((programme) => !programme.isShadow)
  const settled = servicesSettled(listed, onAir)
  const carried = carriedBy(settled)
  const split = splitFrom(settled)
  const withProgrammes = (channel: LiveChannel): LiveChannel => {
    const playing = nowNextOf(carried.get(channel.id) ?? [], now)

    return {
      ...channel,
      ...split.get(channel.id),
      ...playing,
      logo: logos.get(channel.id),
      progressPct: progressOf(playing.now, now),
    }
  }

  return {
    kind,
    kinds,
    channels: listed
      .filter((channel) => channel.kind === kind)
      .map(withProgrammes),
    watching: chosen && watchingOf(withProgrammes(chosen), now),
    profiles,
    tuners,
  }
}

async function countTuners(): Promise<number | undefined> {
  try {
    const { data } = await carinaClient().GET('/api/tuners')

    return data?.data?.desired.length
  } catch {
    return undefined
  }
}

async function fetchLiveChannels(): Promise<LiveChannel[]> {
  const { data, error } = await carinaClient().GET('/api/live/channels', {
    params: {
      query: {
        sort: 'remoteControlKey',
        fields: ['tuning'],
        perPage: EVERY_CHANNEL,
      },
    },
  })

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || 'チャンネルを読めませんでした')
  }

  return data.data.items.map(toChannel)
}

export async function fetchLiveProfiles(): Promise<LiveProfile[]> {
  const { data, error } = await carinaClient().GET('/api/live/profiles')

  if (error || !data?.data) {
    throw new Error(whatItSaid(error, data) || '画質を読めませんでした')
  }

  return data.data.map(toProfile)
}

function toChannel(listed: LiveChannelResponder): LiveChannel {
  const networkId = toInt(listed.networkId)
  const serviceId = toInt(listed.serviceId)
  const system = listed.tuning?.system
  const kind =
    (system && system !== 'unspecified' ? KIND_OF_SYSTEM[system] : undefined) ??
    kindOfNetwork(networkId)

  return {
    id: `${networkId}-${serviceId}`,
    networkId,
    serviceId,
    name: listed.name,
    no:
      listed.remoteControlKeyId == null
        ? undefined
        : String(toInt(listed.remoteControlKeyId)),
    kind,
    viewers: toInt(listed.viewers),
  }
}

function toProfile(profile: LiveProfileResponder): LiveProfile {
  return {
    name: profile.name,
    width: toInt(profile.width),
    height: toInt(profile.height),
    unasked: profile.unasked,
  }
}

function endOf(programme: Programme): number {
  return programme.endsAt
    ? new Date(programme.endsAt).getTime()
    : new Date(programme.startsAt).getTime() + UNDECIDED_DURATION_MS
}

function carriedBy(settled: SettledLineup): Map<string, Programme[]> {
  const carried = new Map<string, Programme[]>()

  for (const one of settled.carried) {
    const already = carried.get(one.service.id)

    if (already) {
      already.push(one.broadcast)
    } else {
      carried.set(one.service.id, [one.broadcast])
    }
  }

  return carried
}

function splitFrom(
  settled: SettledLineup,
): Map<string, Pick<LiveChannel, 'sub' | 'whole'>> {
  return new Map(
    settled.services.map((one) => [
      one.service.id,
      { sub: one.sub, whole: one.whole.id },
    ]),
  )
}

export function nowNextOf(
  carried: readonly Programme[],
  now: Date,
): Pick<LiveChannel, 'now' | 'next'> {
  const at = now.getTime()
  const inOrder = [...carried].sort(
    (left, right) =>
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  )

  const current = inOrder.find(
    (programme) =>
      new Date(programme.startsAt).getTime() <= at && endOf(programme) > at,
  )
  const following = inOrder.find(
    (programme) => new Date(programme.startsAt).getTime() > at,
  )

  return {
    now: current && toLiveProgramme(current),
    next: following && toLiveProgramme(following),
  }
}

function toLiveProgramme(programme: Programme): LiveProgramme {
  return {
    id: programme.id,
    title: programme.name,
    startsAt: programme.startsAt,
    endsAt: programme.endsAt,
    startLabel: clockLabel(new Date(programme.startsAt)),
    endLabel: programme.endsAt
      ? clockLabel(new Date(programme.endsAt))
      : undefined,
    hasSubtitles: programme.hasSubtitles,
    genreLabel: genreDisplayOf(programme).label,
  }
}

function progressOf(programme: LiveProgramme | undefined, now: Date): number {
  if (!programme?.endsAt) {
    return 0
  }

  const from = new Date(programme.startsAt).getTime()
  const to = new Date(programme.endsAt).getTime()
  const share = to > from ? (now.getTime() - from) / (to - from) : 0

  return Math.round(Math.min(1, Math.max(0, share)) * 100)
}

export function watchingOf(channel: LiveChannel, now: Date): LiveWatching {
  const nowLabel = clockLabel(now)
  const programme = channel.now
  const progressPct = progressOf(programme, now)

  if (!programme?.endsAt) {
    return { channel, progressPct, nowLabel }
  }

  const to = new Date(programme.endsAt).getTime()

  return {
    channel,
    progressPct,
    nowLabel,
    restMin: Math.max(0, Math.ceil((to - now.getTime()) / 60_000)),
  }
}
