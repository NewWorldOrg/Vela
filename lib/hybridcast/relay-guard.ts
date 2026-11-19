export type LoadVerdict = 'kept' | 'lost' | 'unopened'

const MOST_HELD = 16

interface Paired<Port> {
  port: Port
  load: number
}

export class RelayGuard<Port> {
  private loads = 0

  private greeting: Paired<Port> | null = null

  private awaiting: number | null = null

  private asked: Paired<Port> | null = null

  private readonly answered = new Set<number>()

  private readonly greeted = new Set<number>()

  private kept = false

  hello(port: Port): { ask: boolean } {
    const awaiting = this.awaiting
    const forLoad =
      awaiting !== null && this.greeting?.load !== awaiting
        ? awaiting
        : this.loads + 1

    this.greeting = { port, load: forLoad }
    this.greeted.add(forLoad)
    this.greeted.delete(forLoad - MOST_HELD)

    const ask = forLoad === awaiting

    if (ask) {
      this.asked = { port, load: forLoad }
    }

    return { ask }
  }

  load(): { nth: number; ask: Port | null } {
    this.loads += 1

    const nth = this.loads
    const ask = this.greeting?.load === nth ? this.greeting.port : null

    this.awaiting = nth
    this.asked = ask === null ? null : { port: ask, load: nth }

    return { nth, ask }
  }

  loaded(port: Port): void {
    const asked = this.asked

    if (asked && asked.port === port && asked.load === this.awaiting) {
      this.answered.add(asked.load)
      this.asked = null
      this.awaiting = null
    }
  }

  hadHello(nth: number): boolean {
    return this.greeted.has(nth)
  }

  verdict(nth: number): LoadVerdict {
    if (this.awaiting === nth) {
      this.awaiting = null
      this.asked = null
    }

    if (this.answered.delete(nth)) {
      this.kept = true

      return 'kept'
    }

    return this.kept ? 'lost' : 'unopened'
  }
}
