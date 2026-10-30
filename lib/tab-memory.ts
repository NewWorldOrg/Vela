/** Where each tab of a phone was left: the address it showed and how far down it was. */
export interface TabPlace {
  address: string
  scrollY: number
}

/** What pressing a tab does: go to an address (and down to a position), or stay and go back to the top. */
export type TabPress =
  | { kind: 'go'; address: string; scrollY: number }
  | { kind: 'top'; address: string }

/** The tabs' places, kept for as long as the page lives. */
export class TabMemory {
  private readonly places = new Map<string, TabPlace>()

  leave(tab: string | null, place: TabPlace): void {
    if (tab) {
      this.places.set(tab, place)
    }
  }

  placeOf(tab: string): TabPlace | undefined {
    return this.places.get(tab)
  }

  forget(tab: string): void {
    this.places.delete(tab)
  }
}

/** Pressing a tab: another tab goes back to the screen and the position it was left at, or to its head when it was never left; the open tab goes to its head screen, at the top. */
export function pressTab(
  memory: TabMemory,
  pressed: string,
  current: string | null,
  here: TabPlace,
): TabPress {
  if (pressed === current) {
    memory.forget(pressed)

    return { kind: 'top', address: pressed }
  }

  memory.leave(current, here)

  const left = memory.placeOf(pressed)

  return left
    ? { kind: 'go', address: left.address, scrollY: left.scrollY }
    : { kind: 'go', address: pressed, scrollY: 0 }
}
