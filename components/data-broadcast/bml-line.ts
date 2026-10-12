import { RELAY_FAILED, type TransmitAnswer } from '@/lib/bml/line'
import { lineAddressOf } from '@/lib/bml/paths'
import type { BmlModule, BmlResource } from '@/lib/bml/resources'
import { LineAwaited } from '@/lib/bml/scripts'

/** The most transmissions one run of a script is answered; past them it is answered as if the relay failed. */
export const MOST_TRANSMITS_IN_A_RUN = 8

/** The most runs left waiting on the line at once. */
export const MOST_AWAITED = 4

/** The most resources one page fetches over the line before it is drawn. */
export const MOST_FETCHES_FOR_A_PAGE = 64

/** The most resources fetched over the line that are kept, the oldest given up first. */
export const MOST_FETCHED = 256

/** One run of a script: the answers it is given back in order, the transmission it is waiting on, and the timers it started, which are stopped when it waits so that its run again does not start them twice. */
export interface LineCall {
  answers: TransmitAnswer[]
  used: number
  asked: number | null
  timers: number[]
}

/** A run stopped to wait on the line, to be run again from its start once the answer is in, and what follows it. */
export interface Awaited<Seen> {
  seen: Seen
  code: string
  answers: TransmitAnswer[]
  then: (() => void) | null
}

export type AskOverTheLine = (
  ask:
    | {
        kind: 'transmit'
        id: number
        uri: string
        text: string
        charset: string
      }
    | { kind: 'fetch'; id: number; uri: string },
) => void

/** What the runtime asks over the line through the player and what came back: the answers that runs wait on, and the documents and resources fetched, by URL. A fetch that failed is kept as null so it is not asked again. */
export class LineRequests<Seen> {
  private readonly ask: AskOverTheLine

  private ids = 0

  private readonly calls: LineCall[] = []

  private readonly awaited = new Map<number, Awaited<Seen>>()

  private readonly fetching = new Map<number, string>()

  private readonly fetched = new Map<string, BmlResource | null>()

  constructor(ask: AskOverTheLine) {
    this.ask = ask
  }

  /** Starts a run that is given back `answers` in order. */
  begin(answers: TransmitAnswer[] = []): LineCall {
    const call: LineCall = { answers, used: 0, asked: null, timers: [] }

    this.calls.push(call)

    return call
  }

  /** Ends a run. When it waits on the line, it is kept to be run again with `seen`, and the timers it started are handed back to be stopped. */
  end(
    call: LineCall,
    seen: Seen,
    code: string,
    then: (() => void) | null,
  ): number[] {
    this.calls.splice(this.calls.lastIndexOf(call), 1)

    if (call.asked === null) {
      return []
    }

    this.awaited.set(call.asked, { seen, code, answers: call.answers, then })

    return call.timers
  }

  /** A timer started by the run going on now. */
  started(timer: number): void {
    this.calls[this.calls.length - 1]?.timers.push(timer)
  }

  /** What the run going on now gets from a transmission: the answer it had before if it is being run again, or, the first time, the request goes out and the run stops to wait. */
  transmit(uri: string, text: string, charset: string): TransmitAnswer {
    const call = this.calls[this.calls.length - 1]

    if (!call) {
      return RELAY_FAILED
    }

    if (call.used < call.answers.length) {
      const answer = call.answers[call.used]

      call.used += 1

      return answer
    }

    if (call.asked !== null) {
      throw new LineAwaited()
    }

    if (
      call.answers.length >= MOST_TRANSMITS_IN_A_RUN ||
      this.awaited.size >= MOST_AWAITED
    ) {
      return RELAY_FAILED
    }

    call.asked = this.next()
    this.ask({ kind: 'transmit', id: call.asked, uri, text, charset })

    throw new LineAwaited()
  }

  /** The run that waited on the answer, with the answer added to those it is given back, or null when nothing waits on it. */
  answered(id: number, answer: TransmitAnswer): Awaited<Seen> | null {
    const awaited = this.awaited.get(id)

    if (!awaited) {
      return null
    }

    this.awaited.delete(id)

    return { ...awaited, answers: [...awaited.answers, answer] }
  }

  /** Whether a URL has been fetched, or failed to be. */
  has(url: string): boolean {
    return this.fetched.has(url)
  }

  /** The resource fetched from a URL, or undefined when it has not been or failed. */
  resource(url: string): BmlResource | undefined {
    return this.fetched.get(url) ?? undefined
  }

  /** Asks for the URLs not fetched yet and not on their way. Past the most a page fetches, the rest are taken as failed. */
  fetch(urls: Iterable<string>): void {
    const asking = new Set(this.fetching.values())
    let asked = 0

    for (const url of urls) {
      if (this.fetched.has(url) || asking.has(url)) {
        continue
      }

      if (asked >= MOST_FETCHES_FOR_A_PAGE) {
        this.keep(url, null)
        continue
      }

      const id = this.next()

      asked += 1
      asking.add(url)
      this.fetching.set(id, url)
      this.ask({ kind: 'fetch', id, uri: url })
    }
  }

  /** Keeps what a fetch brought, each resource under its URL read against the one asked for, and the one asked for under that URL; a module of one resource is that URL's whatever its path. True when no other fetch is on its way. */
  took(id: number, module: BmlModule | null): boolean {
    const url = this.fetching.get(id)

    if (url === undefined) {
      return false
    }

    this.fetching.delete(id)

    module?.resources.forEach((resource) => {
      const at = lineAddressOf(resource.path, url)?.url

      if (at !== undefined) {
        this.keep(at, resource)
      }
    })

    if (!this.fetched.get(url)) {
      const only = module?.resources.length === 1 ? module.resources[0] : null

      this.keep(url, only)
    }

    return this.fetching.size === 0
  }

  get waiting(): boolean {
    return this.fetching.size > 0
  }

  /** Forgets every run that waits and every fetch on its way, as the document they belong to is gone. What was fetched is kept. */
  drop(): void {
    this.awaited.clear()
    this.fetching.clear()
  }

  /** Forgets everything, as the broadcast is closed. */
  clear(): void {
    this.drop()
    this.fetched.clear()
  }

  private keep(url: string, resource: BmlResource | null): void {
    this.fetched.delete(url)
    this.fetched.set(url, resource)

    while (this.fetched.size > MOST_FETCHED) {
      const oldest = this.fetched.keys().next().value

      if (oldest === undefined) {
        return
      }

      this.fetched.delete(oldest)
    }
  }

  private next(): number {
    this.ids += 1

    return this.ids
  }
}
