/**
 * The part of a DOM element the rules below read. Naming it keeps them out of
 * the browser, so what closes a floating surface can be exercised on its own.
 */
export interface DismissTarget {
  closest(selectors: string): unknown
}

interface Press {
  /** What the press landed on. */
  pressed: DismissTarget | null
  /** Whether it landed inside the surface being judged. */
  inside: boolean
  /** The `data-opens` value carried by the controls that open the surface. */
  opener?: string
  /** Whether a layer above the surface has taken the page's presses. */
  covered: boolean
}

/** Matches the controls that open the surface of this name. */
export function opensSurface(name: string): string {
  return `[data-opens="${name}"]`
}

/**
 * Whether a press dismisses a floating surface. It does when it lands outside
 * the surface and outside every control that opens it — a press on one of
 * those is the opener's own business, and dismissing there would close the
 * surface the press is about to reopen.
 *
 * A press while the surface is covered belongs to the layer above it, and the
 * surface below never sees it.
 */
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

/**
 * Whether Escape dismisses a floating surface. Only the topmost layer answers
 * it, so a covered surface stays where it is and the layer above closes.
 */
export function escapeDismisses({ covered }: { covered: boolean }): boolean {
  return !covered
}
