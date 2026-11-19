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

export function everyShownPicked(
  picked: ReadonlySet<string>,
  shown: readonly string[],
): boolean {
  return shown.length > 0 && shown.every((one) => picked.has(one))
}

export function withEveryShown(
  picked: ReadonlySet<string>,
  shown: readonly string[],
): Set<string> {
  return everyShownPicked(picked, shown) ? new Set() : new Set(shown)
}

export type PickedSubject = '録画' | 'ジョブ'

export const PICKED_UNIT = ' 件'

export const PICKED_TAIL = 'を選択'

export function pickedSaying(
  count: number,
  subject: PickedSubject = '録画',
): string {
  return count === 0
    ? `${subject}を選ぶ`
    : `${count}${PICKED_UNIT}${PICKED_TAIL}`
}

export function keepsChoosing(count: number, pickedSome: boolean): boolean {
  return count > 0 || !pickedSome
}
