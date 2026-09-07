export interface DismissTarget {
  closest(selectors: string): unknown
}

interface Press {
  pressed: DismissTarget | null
  inside: boolean
  opener?: string
  covered: boolean
}

export function opensSurface(name: string): string {
  return `[data-opens="${name}"]`
}

export function pressDismisses({
  pressed,
  inside,
  opener,
  covered,
}: Press): boolean {
  if (covered || inside || pressed === null) {
    return false
  }

  return opener === undefined || pressed.closest(opensSurface(opener)) === null
}

export function escapeDismisses({ covered }: { covered: boolean }): boolean {
  return !covered
}
