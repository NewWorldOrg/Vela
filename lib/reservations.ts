/**
 * The bounds the API holds a revision to. They live outside `repository/` so
 * the form that has to say them can read them without reaching the API.
 */
export const PRIORITY_RANGE = { least: 1, most: 99 }

export const MARGIN_RANGE = { least: 0, most: 3600 }

export function withinPriority(value: number): boolean {
  return value >= PRIORITY_RANGE.least && value <= PRIORITY_RANGE.most
}

export function withinMargin(value: number): boolean {
  return value >= MARGIN_RANGE.least && value <= MARGIN_RANGE.most
}

/** A whole number of seconds, or nothing at all when it is not one. */
export function wholeNumber(value: string): number | undefined {
  const trimmed = value.trim()

  return trimmed !== '' && /^\d+$/.test(trimmed) ? Number(trimmed) : undefined
}
