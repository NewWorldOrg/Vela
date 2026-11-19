export interface ProgrammeTold {
  eventId: number | null
  startsAt: number | null
  duration: number | null
  name: string
  description: string
}

export interface EventInformation {
  networkId: number
  serviceId: number
  now: ProgrammeTold | null
  next: ProgrammeTold | null
}

export interface GuideProgramme {
  eventId?: number
  title: string
  description?: string
  startsAt: string
  endsAt?: string
}

const MOST_TEXT = 4096

function millisecondsOf(at: string | undefined): number | null {
  const parsed = at === undefined ? Number.NaN : Date.parse(at)

  return Number.isFinite(parsed) ? parsed : null
}

function toldOf(programme: GuideProgramme | undefined): ProgrammeTold | null {
  if (!programme) {
    return null
  }

  const startsAt = millisecondsOf(programme.startsAt)
  const endsAt = millisecondsOf(programme.endsAt)

  return {
    eventId: programme.eventId ?? null,
    startsAt,
    duration:
      startsAt !== null && endsAt !== null && endsAt > startsAt
        ? Math.round((endsAt - startsAt) / 1000)
        : null,
    name: programme.title.slice(0, MOST_TEXT),
    description: (programme.description ?? '').slice(0, MOST_TEXT),
  }
}

export function eventInformationOf(channel: {
  networkId: number
  serviceId: number
  now?: GuideProgramme
  next?: GuideProgramme
}): EventInformation {
  return {
    networkId: channel.networkId,
    serviceId: channel.serviceId,
    now: toldOf(channel.now),
    next: toldOf(channel.next),
  }
}

function dateOf(at: number | null): Date | null {
  return at === null ? null : new Date(at)
}

export function eventInformationAnswer(
  information: EventInformation,
): Record<string, unknown> {
  const { now, next } = information

  return {
    original_network_id: information.networkId,
    transport_stream_id: null,
    service_id: information.serviceId,
    event_id: now?.eventId ?? null,
    start_time: dateOf(now?.startsAt ?? null),
    duration: now?.duration ?? null,
    name: now?.name ?? '',
    desc: now?.description ?? '',
    f_event_id: next?.eventId ?? null,
    f_start_time: dateOf(next?.startsAt ?? null),
    f_duration: next?.duration ?? null,
    f_name: next?.name ?? '',
    f_desc: next?.description ?? '',
  }
}

function isCount(value: unknown, most: number): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= most
  )
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MOST_TEXT
}

function toldValueOf(value: unknown): ProgrammeTold | null | undefined {
  if (value === null) {
    return null
  }

  const told = value as Partial<ProgrammeTold> | undefined

  return typeof told === 'object' &&
    (told.eventId === null || isCount(told.eventId, 0xffff)) &&
    (told.startsAt === null || Number.isSafeInteger(told.startsAt)) &&
    (told.duration === null || isCount(told.duration, 0xffffff)) &&
    isText(told.name) &&
    isText(told.description)
    ? {
        eventId: told.eventId as number | null,
        startsAt: told.startsAt as number | null,
        duration: told.duration as number | null,
        name: told.name,
        description: told.description,
      }
    : undefined
}

export function eventInformationOfValue(
  value: unknown,
): EventInformation | null {
  const information = value as Partial<EventInformation> | null

  if (
    typeof information !== 'object' ||
    information === null ||
    !isCount(information.networkId, 0xffff) ||
    !isCount(information.serviceId, 0xffff)
  ) {
    return null
  }

  const now = toldValueOf(information.now)
  const next = toldValueOf(information.next)

  return now === undefined || next === undefined
    ? null
    : {
        networkId: information.networkId,
        serviceId: information.serviceId,
        now,
        next,
      }
}

export function sameEventOnAir(
  one: EventInformation | null,
  other: EventInformation | null,
): boolean {
  return (
    one?.networkId === other?.networkId &&
    one?.serviceId === other?.serviceId &&
    one?.now?.eventId === other?.now?.eventId &&
    one?.now?.startsAt === other?.now?.startsAt
  )
}
