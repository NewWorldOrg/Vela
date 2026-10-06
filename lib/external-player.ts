import {
  liveStreamHref,
  liveStreamWithTicketHref,
} from '@/repository/live-paths'
import type { TakeLiveTicket } from '@/repository/live'
import {
  videoFileHref,
  videoFileWithTicketHref,
} from '@/repository/video-paths'
import { NO_TICKET, type TicketWrite } from '@/repository/tickets'
import type { PlaybackPlan } from '@/repository/videos'
import {
  BOTH_SOURCES,
  sourceLabel,
  THE_ARTEFACT,
  THE_RECORDING_ITSELF,
  type PlaybackSource,
} from '@/repository/playback-sources'
import { formatBytes } from '@/lib/format'
import { signedOut } from '@/lib/signed-out'

export interface Handover {
  path: string
  user: string
  named: (inTheClear: string) => string
  take: () => Promise<TicketWrite>
}

export function ticketedHref(
  handover: Handover,
  base: string,
  inTheClear: string,
): string {
  const url = new URL(handover.path, base)

  url.username = handover.user
  url.password = inTheClear

  return url.toString()
}

export function namedHref(
  handover: Handover,
  base: string,
  inTheClear: string,
): string {
  return new URL(handover.named(inTheClear), base).toString()
}

export type Handed = { href: string; named: string }

export type Taken = Handed | { refused: string }

const LONGEST_NAME = 100

const NOT_IN_A_NAME = new Set(['/', '\\', '\u007f'])

function unfit(code: number): boolean {
  return code < 0x20 || (code >= 0xd800 && code <= 0xdfff)
}

function inAName(character: string): string {
  const code = character.codePointAt(0) ?? 0

  return unfit(code) || NOT_IN_A_NAME.has(character) ? ' ' : character
}

/** The file name a player shows as the title: what is being watched, then the extension of what it is handed. */
export function fileNameOf(
  showing: string,
  extension: string,
  otherwise: string,
): string {
  const plain = Array.from(showing, inAName).join('').replace(/\s+/g, ' ')
  const kept = Array.from(plain.trim()).slice(0, LONGEST_NAME).join('').trim()

  return `${kept || otherwise}.${extension}`
}

const A_RECORDING = '録画'

const ON_AIR = 'ライブ'

const TRANSPORT_STREAM = 'ts'

const AN_MP4 = 'mp4'

function extensionOf(source: PlaybackSource | undefined): string {
  return source === THE_ARTEFACT ? AN_MP4 : TRANSPORT_STREAM
}

const SIGNED_OUT = signedOut('外部プレイヤーの札を発行')

async function written(handover: Handover): Promise<TicketWrite> {
  try {
    return await handover.take()
  } catch {
    return { state: 'refused', message: NO_TICKET }
  }
}

/** Asks for a ticket and answers with the URL to hand over, or with what to say instead. */
export async function takeTheTicket(
  handover: Handover,
  base: string,
): Promise<Taken> {
  const write = await written(handover)

  if (write.state === 'unauthenticated') {
    return { refused: SIGNED_OUT }
  }

  if (write.state === 'refused') {
    return { refused: write.message }
  }

  return {
    href: ticketedHref(handover, base, write.ticket.inTheClear),
    named: namedHref(handover, base, write.ticket.inTheClear),
  }
}

export interface HandoverChoice {
  source: PlaybackSource
  label: string
  size?: string
  handover: Handover
}

export function recordingHandover(
  id: string,
  take: (id: string) => Promise<TicketWrite>,
  source?: PlaybackSource,
  title = '',
): Handover {
  const fileName = fileNameOf(title, extensionOf(source), A_RECORDING)

  return {
    path: videoFileHref(id, source),
    user: 'ticket',
    named: (inTheClear) =>
      videoFileWithTicketHref(id, inTheClear, fileName, source),
    take: () => take(id),
  }
}

export function recordingHandoverChoices(
  id: string,
  take: (id: string) => Promise<TicketWrite>,
  plan: Pick<PlaybackPlan, 'source' | 'alternative' | 'externalPlayerSources'>,
  recordedBytes: number | null | undefined,
  title = '',
): HandoverChoice[] {
  const handed = plan.externalPlayerSources ?? [plan.source, plan.alternative]

  return BOTH_SOURCES.filter((one) => handed.includes(one)).map((source) => ({
    source,
    label: sourceLabel(source),
    size:
      source === THE_RECORDING_ITSELF && recordedBytes != null
        ? formatBytes(recordedBytes)
        : undefined,
    handover: recordingHandover(id, take, source, title),
  }))
}

export function liveHandover(
  networkId: number,
  serviceId: number,
  take: TakeLiveTicket,
  channel = '',
  programme = '',
): Handover {
  const fileName = fileNameOf(
    `${channel} ${programme}`,
    TRANSPORT_STREAM,
    ON_AIR,
  )

  return {
    path: liveStreamHref(networkId, serviceId),
    user: '',
    named: (inTheClear) =>
      liveStreamWithTicketHref(networkId, serviceId, inTheClear, fileName),
    take: () => take(networkId, serviceId),
  }
}

export function airPlayCanBeHanded(
  plan: Pick<PlaybackPlan, 'source' | 'transcodes'>,
): boolean {
  return plan.source === THE_ARTEFACT && !plan.transcodes
}

export type PlayerApp = 'vlc' | 'infuse'

export interface Browsing {
  userAgent: string
  maxTouchPoints: number
}

const THE_APPS: Record<
  PlayerApp,
  { says: string; opens: string; takes: keyof Handed }
> = {
  vlc: {
    says: 'VLC で再生',
    opens: 'vlc-x-callback://x-callback-url/stream?url=',
    takes: 'href',
  },
  infuse: {
    says: 'Infuse で再生',
    opens: 'infuse://x-callback-url/play?url=',
    takes: 'named',
  },
}

const IN_THE_HAND = /\b(iPhone|iPad|iPod)\b/

const A_MAC = /\bMacintosh\b/

const ON_A_TOUCH_DEVICE_OF_APPLE: readonly PlayerApp[] = ['vlc', 'infuse']

const ON_A_MAC: readonly PlayerApp[] = ['infuse']

const NOWHERE: readonly PlayerApp[] = []

/** The player apps a browser can hand a URL to, in the order they are offered. */
export function playerAppsOn({
  userAgent,
  maxTouchPoints,
}: Browsing): readonly PlayerApp[] {
  if (IN_THE_HAND.test(userAgent)) {
    return ON_A_TOUCH_DEVICE_OF_APPLE
  }

  if (!A_MAC.test(userAgent)) {
    return NOWHERE
  }

  return maxTouchPoints > 1 ? ON_A_TOUCH_DEVICE_OF_APPLE : ON_A_MAC
}

export const NO_PLAYER_APPS = NOWHERE

export function appSays(app: PlayerApp): string {
  return THE_APPS[app].says
}

/** The URL that opens the app, handing it the ticketed URL in the form the app accepts. */
export function appHref(app: PlayerApp, handed: Handed): string {
  const { opens, takes } = THE_APPS[app]

  return `${opens}${encodeURIComponent(handed[takes])}`
}
