/** What became of one load of the application's frame: its document is on the relay, or it is not, after the frame was on the relay before or before it ever was. */
export type LoadVerdict = 'kept' | 'lost' | 'unopened'

/** How many of the last loads the guard remembers a hello for. */
const MOST_HELD = 16

interface Paired<Port> {
  port: Port
  load: number
}

/** Pairs each load of the application's frame with the one document that said hello for it, and asks that document's port, once the load is over, whether it loaded. A load is kept only when the port of its own hello answers. One hello is taken for each load, a port answers only when asked and only once, and a hello said ahead of a load by the document before it covers nothing: that document is gone from the frame by the load, and its port cannot answer. A hello that arrives after its own load is taken for that load and asked at once. */
export class RelayGuard<Port> {
  private loads = 0

  private greeting: Paired<Port> | null = null

  private awaiting: number | null = null

  private asked: Paired<Port> | null = null

  private readonly answered = new Set<number>()

  private readonly greeted = new Set<number>()

  private kept = false

  /** A document says hello with its port: taken for the load to come, or for the load in progress when that has none yet, unless that load already has its hello. `ask` is whether to ask the port at once, as its load is already over. */
  hello(port: Port): { accepted: boolean; ask: boolean } {
    const awaiting = this.awaiting
    const forLoad =
      awaiting !== null && this.greeting?.load !== awaiting
        ? awaiting
        : this.loads + 1

    if (this.greeting?.load === forLoad) {
      return { accepted: false, ask: false }
    }

    this.greeting = { port, load: forLoad }
    this.greeted.add(forLoad)
    this.greeted.delete(forLoad - MOST_HELD)

    const ask = forLoad === awaiting

    if (ask) {
      this.asked = { port, load: forLoad }
    }

    return { accepted: true, ask }
  }

  /** The frame loaded: the load's number, and the port to ask whether it loaded, none when no hello was said for it. */
  load(): { nth: number; ask: Port | null } {
    this.loads += 1

    const nth = this.loads
    const ask = this.greeting?.load === nth ? this.greeting.port : null

    this.awaiting = nth
    this.asked = ask === null ? null : { port: ask, load: nth }

    return { nth, ask }
  }

  /** A port answers that its document loaded; taken only from the port asked, for the load it was asked about, once. */
  loaded(port: Port): void {
    const asked = this.asked

    if (asked && asked.port === port && asked.load === this.awaiting) {
      this.answered.add(asked.load)
      this.asked = null
      this.awaiting = null
    }
  }

  /** Whether a load had a hello of its own. */
  hadHello(nth: number): boolean {
    return this.greeted.has(nth)
  }

  /** What became of a load, once the moment its document had to answer in is over. */
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
