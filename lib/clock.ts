export function untilTheNextTick(atMs: number, everyMs: number): number {
  const past = atMs % everyMs

  return past === 0 ? everyMs : everyMs - past
}
