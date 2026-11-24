import type { AitApplication } from '@/lib/bml/ait'
import type { AitReception } from '@/lib/bml/browser'
import { RELAY_FAILED, type TransmitAnswer } from '@/lib/bml/line'
import { lineAddressOf } from '@/lib/bml/paths'
import type { BmlModule, BmlResource } from '@/lib/bml/resources'
import { LineAwaited } from '@/lib/bml/scripts'

export const MOST_TRANSMITS_IN_A_RUN = 8

export const MOST_RECEIVED_AITS = 8

export type LineAnswer =
  | { to: 'transmit'; answer: TransmitAnswer }
  | { to: 'ait'; applications: AitApplication[] | null }

export const MOST_AWAITED = 4

export const MOST_FETCHES_FOR_A_PAGE = 64

export const MOST_FETCHED = 256

export interface LineCall {
  answers: LineAnswer[]
  used: number
  asked: number | null
  timers: number[]
}

export interface Awaited<Seen> {
  seen: Seen
  code: string
  answers: LineAnswer[]
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
    | { kind: 'fetch'; id: number; uri: string }
    | { kind: 'ait'; id: number; uri: string },
) => void

export class LineRequests<Seen> {
  private readonly ask: AskOverTheLine

  private ids = 0

  private readonly calls: LineCall[] = []

  private readonly awaited = new Map<number, Awaited<Seen>>()

  private readonly fetching = new Map<number, string>()

  private readonly fetched = new Map<string, BmlResource | null>()

  private readonly receiving = new Map<number, string>()

  private readonly received = new Map<string, AitReception>()

  constructor(ask: AskOverTheLine) {
    this.ask = ask
  }

  begin(answers: LineAnswer[] = []): LineCall {
    const call: LineCall = { answers, used: 0, asked: null, timers: [] }

    this.calls.push(call)

    return call
  }

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

  started(timer: number): void {
    this.calls[this.calls.length - 1]?.timers.push(timer)
  }

  transmit(uri: string, text: string, charset: string): TransmitAnswer {
    const given = this.awaitAnswer((id) =>
      this.ask({ kind: 'transmit', id, uri, text, charset }),
    )

    return given?.to === 'transmit' ? given.answer : RELAY_FAILED
  }

  readAit(uri: string): AitApplication[] | null {
    const given = this.awaitAnswer((id) => this.ask({ kind: 'ait', id, uri }))

    return given?.to === 'ait' ? given.applications : null
  }

  receiveAit(uri: string): boolean {
    if (this.received.get(uri) === 'waiting') {
      return true
    }

    if (!this.received.has(uri) && this.received.size >= MOST_RECEIVED_AITS) {
      return false
    }

    const id = this.next()

    this.received.set(uri, 'waiting')
    this.receiving.set(id, uri)
    this.ask({ kind: 'ait', id, uri })

    return true
  }

  receivedAit(uri: string): AitReception | undefined {
    return this.received.get(uri)
  }

  aitRead(
    id: number,
    applications: AitApplication[] | null,
  ): Awaited<Seen> | null {
    const uri = this.receiving.get(id)

    if (uri === undefined) {
      return this.answered(id, { to: 'ait', applications })
    }

    this.receiving.delete(id)
    this.received.set(uri, applications ?? 'failed')

    return null
  }

  private awaitAnswer(ask: (id: number) => void): LineAnswer | null {
    const call = this.calls[this.calls.length - 1]

    if (!call) {
      return null
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
      return null
    }

    call.asked = this.next()
    ask(call.asked)

    throw new LineAwaited()
  }

  answered(id: number, answer: LineAnswer): Awaited<Seen> | null {
    const awaited = this.awaited.get(id)

    if (!awaited) {
      return null
    }

    this.awaited.delete(id)

    return { ...awaited, answers: [...awaited.answers, answer] }
  }

  has(url: string): boolean {
    return this.fetched.has(url)
  }

  resource(url: string): BmlResource | undefined {
    return this.fetched.get(url) ?? undefined
  }

  fetch(urls: Iterable<string>, before = 0): number {
    const asking = new Set(this.fetching.values())
    let asked = before

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

    return asked - before
  }

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

  get awaiting(): boolean {
    return this.awaited.size > 0
  }

  drop(): void {
    this.awaited.clear()
    this.fetching.clear()
    this.receiving.clear()
    this.received.clear()
  }

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
