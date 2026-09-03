import { servicesSettled, type SettledGuide } from '@/lib/guide'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import type { ChannelKind } from '@/repository/channels'
import type { Programme } from '@/repository/programmes'
import { fetchGuide, toInt } from '@/repository/programmes'
import {
  clockLabel,
  genreDisplayOf,
  kindOfNetwork,
} from '@/repository/programs'

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

/**
 * How far either side of now the programmes are read. Six hours back reaches
 * the start of anything still on air, and six hours on always holds the one
 * that follows it.
 */
const AROUND_NOW_MS = 6 * 60 * 60 * 1000

/** How long a programme whose end the broadcaster has not said is taken to run. */
const UNDECIDED_DURATION_MS = 30 * 60 * 1000

type SettledLineup = SettledGuide<LiveChannel, Programme>

/** More than the aerial reaches: every channel arrives on one page. */
const EVERY_CHANNEL = 200

export interface LiveProgramme {
  id: string
  title: string
  startsAt: string
  /** Absent while the broadcaster has not said when it ends. */
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
  /** The remote-control key, where the broadcast type has one. */
  no?: string
  kind: ChannelKind
  /** Whether this service split off another of its network. */
  sub?: boolean
  /**
   * The channel this one split off, where it split off one. It is what says
   * which card a split's hours are read against, and a split says nothing
   * about that itself.
   */
  whole?: string
  /** How many are watching this channel right now, over every profile. */
  viewers: number
  now?: LiveProgramme
  next?: LiveProgramme
  /** 0–100 of the programme on air. Nought where no programme is known. */
  progressPct?: number
}

export interface LiveProfile {
  name: string
  width: number
  height: number
}

/** The channel being watched, and where its programme stands. */
export interface LiveWatching {
  channel: LiveChannel
  /** 0–100 of the programme on air. Nought when no programme is known. */
  progressPct: number
  nowLabel: string
  /** Minutes left of the programme on air; absent when its end is unknown. */
  restMin?: number
}

export interface LiveScreen {
  kind: ChannelKind
  channels: LiveChannel[]
  watching?: LiveWatching
  profiles: LiveProfile[]
}

export function kindOf(rawKind: string | undefined): ChannelKind {
  return rawKind === 'bs' || rawKind === 'cs110' ? rawKind : 'terrestrial'
}

export async function getLiveScreen(
  rawKind: string | undefined,
  rawChannel: string | undefined,
  now: Date = new Date(),
): Promise<LiveScreen> {
  const kind = kindOf(rawKind)
  const [listed, profiles] = await Promise.all([
    fetchLiveChannels(),
    fetchLiveProfiles(),
  ])
  const chosen = listed.find((channel) => channel.id === rawChannel)

  // The channel being watched stays on air while another kind's list is
  // browsed, so its programmes are read even when it is not on the list shown.
  const kinds = [...new Set([kind, ...(chosen ? [chosen.kind] : [])])]
  const guides = await Promise.all(
    kinds.map((one) =>
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
      progressPct: progressOf(playing.now, now),
    }
  }

  return {
    kind,
    channels: listed
      .filter((channel) => channel.kind === kind)
      .map(withProgrammes),
    watching: chosen && watchingOf(withProgrammes(chosen), now),
    profiles,
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
    throw new Error(data?.message || 'チャンネルを読めませんでした')
  }

  return data.data.items.map(toChannel)
}

async function fetchLiveProfiles(): Promise<LiveProfile[]> {
  const { data, error } = await carinaClient().GET('/api/live/profiles')

  if (error || !data?.data) {
    throw new Error(data?.message || '画質を読めませんでした')
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
  }
}

function endOf(programme: Programme): number {
  return programme.endsAt
    ? new Date(programme.endsAt).getTime()
    : new Date(programme.startsAt).getTime() + UNDECIDED_DURATION_MS
}

/**
 * What each channel of the list is carrying, settled the way the guide settles
 * its columns: what is its own, and for the hours it has nothing of its own,
 * whatever names it under a share.
 *
 * A service splits into two or three for the hours it has two or three things
 * to show and carries the one thing on all of them for the rest of the day.
 * Nearly every one of those hours reaches the split with no event of its own,
 * so a row read by service number alone says the split has no listing while
 * the row above it names the very programme the split is showing.
 */
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

/**
 * Which card a split's hours are read against, taken from the same settling
 * the guide's columns are: the service each network split from is the lowest
 * numbered it hands over, which is a fact about the numbering and not about
 * the order the line-up arrived in.
 */
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

/**
 * What is on this channel now, and what follows it, read off what the channel
 * carries. A programme with no end said is taken to run half an hour, the way
 * the guide draws it.
 */
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

/**
 * How far into the programme the clock is, as a share of it.
 *
 * A programme whose end the broadcaster has not said stands at nought rather
 * than at a guess: a bar drawn against an invented length says how far through
 * something the viewer is, and nobody knows that yet.
 */
function progressOf(programme: LiveProgramme | undefined, now: Date): number {
  if (!programme?.endsAt) {
    return 0
  }

  const from = new Date(programme.startsAt).getTime()
  const to = new Date(programme.endsAt).getTime()
  const share = to > from ? (now.getTime() - from) / (to - from) : 0

  return Math.round(Math.min(1, Math.max(0, share)) * 100)
}

/** Where the programme on the chosen channel stands at this moment. */
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
