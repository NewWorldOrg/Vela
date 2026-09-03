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
 * Whether the programme is on air at this reading of the clock: begun, and not
 * yet over. A day with no present in it has nothing on air, so no programme of
 * it is — the guide of yesterday holds what was on, and tomorrow's what will
 * be, and neither can be watched live.
 */
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

/** When a broadcast runs, as the API spells it. */
export interface GuideRun {
  startsAt: string
  /** Absent while the broadcaster has not said when it ends. */
  endsAt?: string
}

/** A service the grid draws, and the broadcasts that go in its column. */
export interface SettledGuide<S, B> {
  /** `whole` is the service the column split from, and itself where it has not. */
  services: { service: S; sub: boolean; whole: S }[]
  carried: { service: S; broadcast: B }[]
}

/**
 * Which services the grid draws a column for, and which broadcasts go in them.
 *
 * Every service the line-up hands over takes a column. A channel that can be
 * tuned is a channel whose evening can be read, and one that leaves the grid
 * on the days it is carrying its neighbour's broadcast reads as a channel that
 * has stopped rather than one that is showing the same thing — while the
 * channel beside it, whose broadcaster spells the same arrangement a different
 * way, stays. Which columns there are would then be a fact about the
 * broadcaster's encoding rather than about what is on air.
 *
 * A service splits into two or three for the hours it has two or three things
 * to show, and carries the one thing on all of them for the rest of the day.
 * Those hours are not blank ones, and the broadcaster says what is in them: the
 * event it sends on the service the split came from names, under a share, the
 * split the same programme is going out on. So a column carries what is its
 * own, and for the hours it has nothing of its own, whatever names it under a
 * share.
 *
 * That naming is the only reliable word for it, and the title is not. Most
 * shared hours reach the split with no title at all, and the ones that do
 * arrive titled carry the whole service's title.
 */
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

/**
 * Whether two broadcasts would be drawn over each other in one column.
 *
 * A share belongs in the hours the column has nothing of its own, and the
 * broadcaster's naming already keeps the two apart. This is what holds that
 * rather than trusting it: two cells over the same minutes are two answers to
 * what is on, and the column's own is the one it keeps.
 *
 * A broadcast whose end the broadcaster has not said runs to no length here.
 * It is a start and nothing more until they say otherwise, and a guessed length
 * would let the guess decide what a column shows; two such starting together
 * are still the same minute twice.
 */
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

/**
 * The service each network split from, which is the lowest numbered it hands
 * over. It is what says whether a column is a split of another, which is how
 * the grid marks it.
 *
 * It is read off the network rather than off the order the columns arrived in.
 * That order is a presentation — the line-up is sorted by remote control key,
 * which a service does not always send — and a key that has not arrived yet
 * puts a column at the number it would sort under instead, which can be ahead
 * of the service it split from. A service number is allocated before the ones
 * that split off it and is sent either way, so it answers the question the sort
 * order was never being asked.
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

/** A column of the grid, as the fold reads one. */
export interface FoldableColumn {
  id: string
  /** A service that split off another, which is all the fold ever takes away. */
  sub?: boolean
  /** The column this one split from, where it split from one. */
  whole?: string
}

/** A cell of the grid, as the fold reads one. */
export interface FoldableCell {
  channelId: string
  startMin: number
  durationMin: number
  title: string
}

/** The line-up and the cells it is drawn with, after a fold. */
export interface FoldedGuide<C, P> {
  channels: C[]
  programs: P[]
}

/**
 * A cell as the fold compares it: the minutes it covers and what is in them.
 * Two columns drawing this are two columns showing the same thing.
 */
function drawnAs(cell: FoldableCell): string {
  return `${cell.startMin}|${cell.durationMin}|${cell.title}`
}

/**
 * The grid with the hours a split is repeating its station taken out, and then
 * the columns that had nothing else in them.
 *
 * A station splits into two or three for the hours it has that much to show
 * and puts the one thing out on all of them for the rest of the day, so most
 * of the grid's width goes on columns whose cells are the cell beside them
 * printed again. Measured on one aerial's evening: **27 columns, of which 15
 * draw nothing all day that the column they split from is not drawing.**
 *
 * What is compared is what is drawn — the run and the name — and not what the
 * broadcaster said about it. The station spells the same arrangement two ways
 * and sends both on the same night: it names the split under a share on its
 * own event, and it also sends the split events of its own carrying the same
 * programme at the same hour. A fold that read only the naming took one column
 * of the 27 away and left the rest of the repetition on screen.
 *
 * The fold is put as "take out the repeated hours, then the columns left
 * empty", and not as "take out the splits", because a split is not the same
 * thing as a repetition. A split running a schedule of its own for part of the
 * day keeps its column and keeps those hours; what it loses is the hours it
 * was repeating, which become the blank hours they already are on any other
 * day. A fold that took the column would take that schedule with it, and a
 * reader folding away a repetition has not asked to stop being shown what is
 * only on that channel.
 *
 * Only a split is ever taken. A column of a station that has not split is
 * empty because its listings have not arrived, which is a different thing from
 * a column with nothing of its own to show, and not what the reader asked to
 * hide.
 */
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

/**
 * Whether folding would take a column away, which is when there is a fold to
 * offer. A day whose splits all have something of their own — or one with no
 * split at all — is a day the press cannot change, and a press that cannot
 * change anything is not drawn.
 */
export function foldsAColumn<C extends FoldableColumn, P extends FoldableCell>(
  channels: readonly C[],
  programs: readonly P[],
): boolean {
  return foldedGuideOf(channels, programs).channels.length < channels.length
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
