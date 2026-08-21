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
