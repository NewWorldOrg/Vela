export const SILENCE_RANGE = { least: 1, most: 720 }

export function withinSilence(hours: number): boolean {
  return hours >= SILENCE_RANGE.least && hours <= SILENCE_RANGE.most
}
