/** What the box that picks every listed row shows while `chosen` of the `listed` are picked. */
export function checkedOutOf(
  chosen: number,
  listed: number,
): boolean | 'indeterminate' {
  if (chosen === 0) {
    return false
  }

  return chosen === listed ? true : 'indeterminate'
}
