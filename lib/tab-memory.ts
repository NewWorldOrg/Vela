export interface TabPlace {
  address: string
  scrollY: number
}

export type TabPress =
  | { kind: 'go'; address: string; scrollY: number }
  | { kind: 'top'; address: string }

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
