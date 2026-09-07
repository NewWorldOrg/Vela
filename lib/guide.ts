export const DAY_STARTS_AT_HOUR = 4

export const JST_OFFSET_MS = 9 * 60 * 60 * 1000

export const WINDOW_HOURS = 24

const OPENING_LEAD_MIN = 30

export function broadcastDateOf(at: Date): string {
  const shifted = new Date(
    at.getTime() + JST_OFFSET_MS - DAY_STARTS_AT_HOUR * 60 * 60 * 1000,
  )

  return shifted.toISOString().slice(0, 10)
}

export function windowStartOf(date: string): Date {
  return new Date(
    new Date(`${date}T00:00:00Z`).getTime() +
      DAY_STARTS_AT_HOUR * 60 * 60 * 1000 -
      JST_OFFSET_MS,
  )
}

export function nowMinOf(now: Date, windowStart: Date): number | undefined {
  const into = now.getTime() - windowStart.getTime()

  if (into < 0 || into >= WINDOW_HOURS * 60 * 60 * 1000) {
    return undefined
  }

  return Math.floor(into / 60_000)
}

export function isOnAir(
  program: { startMin: number; durationMin: number },
  nowMin: number | undefined,
): boolean {
  if (nowMin === undefined) {
    return false
  }

  return (
    program.startMin <= nowMin &&
    nowMin < program.startMin + program.durationMin
  )
}

export function openingScrollTopOf(
  nowMin: number | undefined,
  hourPx: number,
): number {
  if (nowMin === undefined) {
    return 0
  }

  return Math.max(0, ((nowMin - OPENING_LEAD_MIN) / 60) * hourPx)
}

export interface GuideService {
  networkId: number
  serviceId: number
}

export type GuideRelationKind = 'shared' | 'relayed' | 'moved'

export interface GuideRelation extends GuideService {
  kind: GuideRelationKind
}

export function sharesWith(
  broadcast: { related: readonly GuideRelation[] },
  service: GuideService,
): boolean {
  return broadcast.related.some(
    (relation) =>
      relation.kind === 'shared' &&
      relation.networkId === service.networkId &&
      relation.serviceId === service.serviceId,
  )
}

export interface GuideRun {
  startsAt: string
  endsAt?: string
}

export interface SettledGuide<S, B> {
  services: { service: S; sub: boolean; whole: S }[]
  carried: { service: S; broadcast: B }[]
}

export function servicesSettled<
  S extends GuideService,
  B extends GuideService & GuideRun & { related: readonly GuideRelation[] },
>(services: readonly S[], broadcasts: readonly B[]): SettledGuide<S, B> {
  const wholes = wholeServicesOf(services)
  const drawn: { service: S; sub: boolean; whole: S }[] = []
  const carried: { service: S; broadcast: B }[] = []

  for (const service of services) {
    const own = broadcasts.filter((broadcast) => isOf(broadcast, service))
    const shared = broadcasts.filter(
      (broadcast) =>
        !isOf(broadcast, service) &&
        sharesWith(broadcast, service) &&
        !own.some((mine) => runsOver(mine, broadcast)),
    )
    const whole = wholes.get(service.networkId)

    drawn.push({
      service,
      sub: whole !== undefined && whole.serviceId !== service.serviceId,
      whole: whole ?? service,
    })
    carried.push(
      ...[...own, ...shared].map((broadcast) => ({ service, broadcast })),
    )
  }

  return { services: drawn, carried }
}

function isOf(broadcast: GuideService, service: GuideService): boolean {
  return (
    broadcast.networkId === service.networkId &&
    broadcast.serviceId === service.serviceId
  )
}

function runsOver(one: GuideRun, other: GuideRun): boolean {
  const [from, to] = runOf(one)
  const [start, end] = runOf(other)

  return from === start || (from < end && start < to)
}

function runOf(run: GuideRun): [number, number] {
  const from = new Date(run.startsAt).getTime()

  return [
    from,
    run.endsAt === undefined ? from : new Date(run.endsAt).getTime(),
  ]
}

function wholeServicesOf<S extends GuideService>(
  services: readonly S[],
): Map<number, S> {
  const wholes = new Map<number, S>()

  for (const service of services) {
    const whole = wholes.get(service.networkId)

    if (!whole || service.serviceId < whole.serviceId) {
      wholes.set(service.networkId, service)
    }
  }

  return wholes
}

export interface GuideSpan {
  startMin: number
  durationMin: number
}

export function unscheduledSpansOf(
  carried: readonly GuideSpan[],
  windowMin: number,
): GuideSpan[] {
  const taken = carried
    .map((span) => ({
      from: Math.max(0, span.startMin),
      to: Math.min(windowMin, span.startMin + span.durationMin),
    }))
    .filter((span) => span.to > span.from)
    .sort((a, b) => a.from - b.from)

  const spans: GuideSpan[] = []
  let open = 0

  for (const span of taken) {
    if (span.from > open) {
      spans.push({ startMin: open, durationMin: span.from - open })
    }

    open = Math.max(open, span.to)
  }

  if (open < windowMin) {
    spans.push({ startMin: open, durationMin: windowMin - open })
  }

  return spans
}

export interface FoldableColumn {
  id: string
  sub?: boolean
  whole?: string
}

export interface FoldableCell {
  channelId: string
  startMin: number
  durationMin: number
  title: string
}

export interface FoldedGuide<C, P> {
  channels: C[]
  programs: P[]
}

function drawnAs(cell: FoldableCell): string {
  return `${cell.startMin}|${cell.durationMin}|${cell.title}`
}

export function foldedGuideOf<C extends FoldableColumn, P extends FoldableCell>(
  channels: readonly C[],
  programs: readonly P[],
): FoldedGuide<C, P> {
  const drawnOn = new Map<string, Set<string>>()

  for (const cell of programs) {
    const column = drawnOn.get(cell.channelId)

    if (column) {
      column.add(drawnAs(cell))
    } else {
      drawnOn.set(cell.channelId, new Set([drawnAs(cell)]))
    }
  }

  const splitFrom = new Map<string, string>()

  for (const channel of channels) {
    if (channel.sub && channel.whole && channel.whole !== channel.id) {
      splitFrom.set(channel.id, channel.whole)
    }
  }

  const kept = programs.filter((cell) => {
    const whole = splitFrom.get(cell.channelId)

    return whole === undefined || !drawnOn.get(whole)?.has(drawnAs(cell))
  })

  return {
    channels: channels.filter(
      (channel) =>
        !splitFrom.has(channel.id) ||
        kept.some((cell) => cell.channelId === channel.id),
    ),
    programs: kept,
  }
}

export function foldsAColumn<C extends FoldableColumn, P extends FoldableCell>(
  channels: readonly C[],
  programs: readonly P[],
): boolean {
  return foldedGuideOf(channels, programs).channels.length < channels.length
}

export const GUTTER_PX = 46

export const COLUMN_MIN_PX = 200

export function gridMinWidthOf(columns: number): number {
  return GUTTER_PX + columns * COLUMN_MIN_PX
}
