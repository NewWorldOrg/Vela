/** The picked recordings after one is pressed: taken in or left out, and with Shift held, every one from the one pressed before along with it. */
export function pressedPick(
  picked: ReadonlySet<string>,
  shown: readonly string[],
  id: string,
  from?: string,
): Set<string> {
  const next = new Set(picked)
  const taken = !picked.has(id)
  const at = shown.indexOf(id)
  const fromAt = from === undefined ? -1 : shown.indexOf(from)
  const range =
    at < 0 || fromAt < 0
      ? [id]
      : shown.slice(Math.min(at, fromAt), Math.max(at, fromAt) + 1)

  for (const one of range) {
    if (taken) {
      next.add(one)
    } else {
      next.delete(one)
    }
  }

  return next
}

/** Whether every recording shown is picked, which there must be one of. */
export function everyShownPicked(
  picked: ReadonlySet<string>,
  shown: readonly string[],
): boolean {
  return shown.length > 0 && shown.every((one) => picked.has(one))
}

/** The picked recordings after `すべて選ぶ`: every one shown, or after `すべて外す`, none. */
export function withEveryShown(
  picked: ReadonlySet<string>,
  shown: readonly string[],
): Set<string> {
  return everyShownPicked(picked, shown) ? new Set() : new Set(shown)
}

/** What the choosing row says of how many are picked. */
export function pickedSaying(count: number): string {
  return count === 0 ? '録画を選ぶ' : `${count} 件を選択`
}

/** Whether the library goes on choosing with `count` picked: it stops once none is left, unless nothing has been picked yet since `選ぶ` was pressed, so `すべて選ぶ` can still be reached. */
export function keepsChoosing(count: number, pickedSome: boolean): boolean {
  return count > 0 || !pickedSome
}
