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
 */
export const COLUMN_MIN_PX = 200

/**
 * A column for a service that has split, which carries a programme of its own
 * only for the hours of the split and is drawn narrow on purpose. It is not a
 * column the sharing ever squeezed, so the floor above is not what it is for.
 */
export const SUB_COLUMN_PX = 78

/**
 * The narrowest the grid can be drawn: the gutter, plus a column apiece. Given
 * as a minimum rather than as the width, so that a handful of channels still
 * spread across the screen they are read on and only a line-up too wide to fit
 * turns into a sideways scroll.
 */
export function gridMinWidthOf(channels: readonly { sub?: boolean }[]): number {
  return channels.reduce(
    (width, channel) => width + (channel.sub ? SUB_COLUMN_PX : COLUMN_MIN_PX),
    GUTTER_PX,
  )
}
