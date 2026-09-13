import { formatClock } from '@/lib/format'
import type {
  LiveChannel,
  LiveProgramme,
  LiveScreen,
  LiveWatching,
} from '@/repository/live'
import type { LiveViewerCounts } from '@/repository/live-viewers'

export function progressOf(
  programme: LiveProgramme | undefined,
  now: Date,
): number {
  if (!programme?.endsAt) {
    return 0
  }

  const from = new Date(programme.startsAt).getTime()
  const to = new Date(programme.endsAt).getTime()
  const share = to > from ? (now.getTime() - from) / (to - from) : 0

  return Math.round(Math.min(1, Math.max(0, share)) * 100)
}

export function watchingOf(channel: LiveChannel, now: Date): LiveWatching {
  const nowLabel = formatClock(now.getTime())
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

export function screenAsOf(
  screen: LiveScreen,
  now: Date,
  viewers?: LiveViewerCounts,
): LiveScreen {
  const watched = screen.watching

  return {
    ...screen,
    channels: screen.channels.map((channel) => asOf(channel, now, viewers)),
    watching: watched && watchingOf(asOf(watched.channel, now, viewers), now),
  }
}

export function nextProgrammeChangeAt(
  screen: LiveScreen,
  now: Date,
): number | undefined {
  const at = now.getTime()
  const marks = listedWithTheOneWatched(screen)
    .flatMap((channel) => [channel.now?.endsAt, channel.next?.startsAt])
    .map((when) => (when === undefined ? Number.NaN : Date.parse(when)))
    .filter((when) => Number.isFinite(when) && when > at)

  return marks.length === 0 ? undefined : Math.min(...marks)
}

function listedWithTheOneWatched(screen: LiveScreen): LiveChannel[] {
  const watched = screen.watching

  return watched ? [...screen.channels, watched.channel] : [...screen.channels]
}

function asOf(
  channel: LiveChannel,
  now: Date,
  viewers?: LiveViewerCounts,
): LiveChannel {
  const counted = viewers?.[channel.id]

  return {
    ...channel,
    progressPct: progressOf(channel.now, now),
    viewers: counted ?? channel.viewers,
  }
}
