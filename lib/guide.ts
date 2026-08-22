/** The hour a broadcast day begins, in Japan standard time. */
export const DAY_STARTS_AT_HOUR = 4

export const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/** A guide window is one broadcast day: four in the morning to four again. */
export const WINDOW_HOURS = 24

/** How far above now the guide is scrolled when it is opened. */
const OPENING_LEAD_MIN = 30

/**
 * The broadcast day an instant belongs to. The hours after midnight belong to
 * the date before them, which is the day their programmes were listed under
 * and the day a guide opened at one in the morning has to be showing.
 */
export function broadcastDateOf(at: Date): string {
  const shifted = new Date(
    at.getTime() + JST_OFFSET_MS - DAY_STARTS_AT_HOUR * 60 * 60 * 1000,
  )

  return shifted.toISOString().slice(0, 10)
}

/** The instant a broadcast day's window opens. */
export function windowStartOf(date: string): Date {
  return new Date(
    new Date(`${date}T00:00:00Z`).getTime() +
      DAY_STARTS_AT_HOUR * 60 * 60 * 1000 -
      JST_OFFSET_MS,
  )
}

/**
 * Where now falls in a window, in minutes from the top of it, and nothing at
 * all when the window is not the one now is in.
 *
 * Everything the grid says about the present is measured from this one number
 * — the line, the label it carries, which cells have ended, and where the grid
 * opens — so a day other than today is a day with no present in it, rather
 * than one given a place by a second reading of the clock.
 */
export function nowMinOf(now: Date, windowStart: Date): number | undefined {
  const into = now.getTime() - windowStart.getTime()

  if (into < 0 || into >= WINDOW_HOURS * 60 * 60 * 1000) {
    return undefined
  }

  return Math.floor(into / 60_000)
}

/**
 * How far down the grid is scrolled when it is opened: half an hour above the
 * line, so that what is on air now is on screen with the end of what it
 * followed still above it.
 *
 * A day the present is not in — the day before, the day after, an archived one
 * — opens at the top, where the broadcast day starts. No hour of such a day is
 * more the current one than any other, and inventing a place to open at would
 * be answering a question the day does not ask. The same answer serves the
 * first half hour of today, where the lead would run off the top of the
 * window.
 */
export function openingScrollTopOf(
  nowMin: number | undefined,
  hourPx: number,
): number {
  if (nowMin === undefined) {
    return 0
  }

  return Math.max(0, ((nowMin - OPENING_LEAD_MIN) / 60) * hourPx)
}

/** A service of a network, which is what a column of the grid stands for. */
export interface GuideService {
  networkId: number
  serviceId: number
}

/**
 * What one broadcast says about another it names.
 *
 * The three words are the broadcaster's own, and the whole of the reading
 * below turns on telling a share from the other two, so they are spelled out
 * as the three they are rather than as a string. The same three are written
 * one casing up where they are stored, and a column settled against `Shared`
 * would settle against nothing at all and say so in no way a compiler could.
 */
export type GuideRelationKind = 'shared' | 'relayed' | 'moved'

/** Another broadcast a broadcast says something about. */
export interface GuideRelation extends GuideService {
  kind: GuideRelationKind
}

/**
 * Whether a broadcast is the one another service is carrying at that hour.
 *
 * A service splits into two or three for the hours it has two or three things
 * to show, and carries the one thing on all of them for the rest of the day.
 * The broadcaster says which it is doing: every event it sends on a column it
 * has split into names, under a share, the service the same programme is going
 * out on. That is the only reliable word for it — the name is not. Most shared
 * hours arrive with no name at all, and the ones that do arrive named carry
 * the same name as the whole service, so a column read by name alone repeats
 * whatever the service beside it is showing.
 *
 * A relay and a move name another service too and mean the opposite: the same
 * programme at another hour or from another transmitter, which is a different
 * cell and not this one.
 */
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

/**
 * Which services the grid draws a column for, and which broadcasts go in them.
 *
 * The lowest numbered service of a network is the service. Any above it is a
 * column that service splits into for the hours it has a second thing to show,
 * and such a column carries only what is its own: an hour it is sharing the
 * whole service's broadcast is not a second programme, and drawn as one it
 * fills the column with a copy of the one beside it.
 *
 * A day it has nothing of its own at any hour takes no column. A column is put
 * out for the hours a split is on air, and a day with no such hour has none to
 * put out; a column that said nothing from four in the morning to four again
 * would still take a column's width off a grid that already runs off the side.
 */
export function splitServicesSettled<
  S extends GuideService,
  B extends GuideService & { related: readonly GuideRelation[] },
>(
  services: readonly S[],
  broadcasts: readonly B[],
): { services: { service: S; sub: boolean }[]; broadcasts: B[] } {
  const wholes = wholeServicesOf(services)
  const drawn: { service: S; sub: boolean }[] = []
  const carried: B[] = []

  for (const service of services) {
    const on = broadcasts.filter(
      (broadcast) =>
        broadcast.networkId === service.networkId &&
        broadcast.serviceId === service.serviceId,
    )
    const whole = wholes.get(service.networkId)

    if (!whole || whole.serviceId === service.serviceId) {
      drawn.push({ service, sub: false })
      carried.push(...on)

      continue
    }

    const own = on.filter((broadcast) => !sharesWith(broadcast, whole))

    if (own.length === 0) {
      continue
    }

    drawn.push({ service, sub: true })
    carried.push(...own)
  }

  return { services: drawn, broadcasts: carried }
}

/**
 * The service each network split from, which is the lowest numbered it hands
 * over.
 *
 * It is read off the network rather than off the order the columns arrived in.
 * That order is a presentation — the line-up is sorted by remote control key,
 * which a service does not always send — and a key that has not arrived yet
 * puts a column at the number it would sort under instead, which can be ahead
 * of the service it split from. Settled against whichever column came first,
 * the whole service would be the one read as a split, and since every one of
 * its broadcasts names the split under a share, every one of them would be
 * dropped and its column would leave the guide. A service number is allocated
 * before the ones that split off it and is sent either way, so it answers the
 * question the sort order was never being asked.
 */
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

/** A run of the guide window, in minutes from the top of it. */
export interface GuideSpan {
  startMin: number
  durationMin: number
}

/**
 * The runs of the window a column carries nothing of its own, given the
 * programmes it does carry.
 *
 * It is the complement and not a second reading of the schedule: whatever a
 * column has no cell for is an hour it is not being programmed, and saying so
 * twice — once by drawing the cells, once by listing the gaps — is two answers
 * that can disagree.
 */
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

/** The hour gutter down the left of the grid, which is not a channel. */
export const GUTTER_PX = 46

/**
 * The narrowest a channel column is ever drawn.
 *
 * Columns share whatever width there is, and sharing alone has no floor: one
 * aerial hands over 27 television services, and 27 of them across a 1400px
 * screen leaves 50px a column, which holds no programme name. So the sharing
 * stops here and the grid runs off the side instead — it is the reader who
 * decides how many columns to look at, by scrolling, rather than the count
 * deciding that none of them can be read.
 *
 * A service that has split is not an exception to it. Its column was drawn at
 * 78px on the reading that a split is an hour borrowed from the service it
 * split from, and that is not what a split is: such a service runs a schedule
 * of its own, hundreds of programmes over a day, and a column that narrow
 * breaks their names down the page a character at a time. The hours it carries
 * nothing are blank hours, which is not a reason to take the width away from
 * the hours it does. Width says how much there is to read, and that is only
 * worth saying when there really is less of it.
 */
export const COLUMN_MIN_PX = 200

/**
 * The narrowest the grid can be drawn: the gutter, plus a column apiece. Given
 * as a minimum rather than as the width, so that a handful of channels still
 * spread across the screen they are read on and only a line-up too wide to fit
 * turns into a sideways scroll.
 *
 * How many columns there are is the whole of it. It takes the count and not
 * the channels because there is nothing about a channel left that could widen
 * or narrow the column it is given.
 */
export function gridMinWidthOf(columns: number): number {
  return GUTTER_PX + columns * COLUMN_MIN_PX
}
