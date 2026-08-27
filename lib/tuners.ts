/**
 * The bounds the API holds the health threshold to. They live outside
 * `repository/` so the form that has to say them can read them without
 * reaching the API.
 */
export const SILENCE_RANGE = { least: 1, most: 720 }

export function withinSilence(hours: number): boolean {
  return hours >= SILENCE_RANGE.least && hours <= SILENCE_RANGE.most
}
