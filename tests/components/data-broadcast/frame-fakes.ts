import vm from 'node:vm'
import { DOMParser } from '@xmldom/xmldom'

import {
  givenOf,
  globalBindingsOf,
  SHADOWED_GLOBALS,
  type Evaluate,
  type GlobalBindings,
} from '@/lib/bml/scripts'
import type { RuntimeWindow } from '@/components/data-broadcast/bml-runtime'

/** Enough of a DOM for the runtime to draw a page into and for a document's scripts to read and write: elements with attributes, inline style, children and a parent, and text nodes. */
export class FakeStyle {
  private readonly set = new Map<string, string>()

  left = ''

  top = ''

  transform = ''

  width = ''

  height = ''

  setProperty(name: string, value: string): void {
    this.set.set(name, value)
  }

  getPropertyValue(name: string): string {
    return this.set.get(name) ?? ''
  }

  get properties(): Record<string, string> {
    return Object.fromEntries(this.set)
  }
}

export class FakeNode {
  parentNode: FakeElement | null = null

  readonly ownerDocument: FakeDocument

  constructor(ownerDocument: FakeDocument) {
    this.ownerDocument = ownerDocument
  }

  get nodeType(): number {
    return 0
  }

  private siblings(): FakeNode[] {
    return this.parentNode?.childNodes ?? []
  }

  get previousSibling(): FakeNode | null {
    const siblings = this.siblings()

    return siblings[siblings.indexOf(this) - 1] ?? null
  }

  get nextSibling(): FakeNode | null {
    const siblings = this.siblings()

    return siblings[siblings.indexOf(this) + 1] ?? null
  }

  remove(): void {
    const siblings = this.siblings()
    const at = siblings.indexOf(this)

    if (at >= 0) {
      siblings.splice(at, 1)
    }

    this.parentNode = null
  }
}

export class FakeText extends FakeNode {
  data: string

  constructor(ownerDocument: FakeDocument, data: string) {
    super(ownerDocument)
    this.data = data
  }

  get nodeType(): number {
    return 3
  }
}

export class FakeElement extends FakeNode {
  readonly tagName: string

  readonly attributes = new Map<string, string>()

  readonly style = new FakeStyle()

  readonly childNodes: FakeNode[] = []

  textContent = ''

  constructor(ownerDocument: FakeDocument, tagName: string) {
    super(ownerDocument)
    this.tagName = tagName.toUpperCase()
  }

  get nodeType(): number {
    return 1
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value)
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name)
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name)
  }

  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null
  }

  get lastChild(): FakeNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null
  }

  append(...nodes: FakeNode[]): void {
    nodes.forEach((node) => {
      node.remove()
      node.parentNode = this
      this.childNodes.push(node)
    })
  }

  replaceChildren(...nodes: FakeNode[]): void {
    this.childNodes.forEach((node) => {
      node.parentNode = null
    })
    this.childNodes.length = 0
    this.append(...nodes)
  }

  /** The text of this element and everything under it. */
  get text(): string {
    return this.childNodes
      .map((node) =>
        node instanceof FakeText ? node.data : (node as FakeElement).text,
      )
      .join('')
  }

  /** The first element under this one with an attribute of that value. */
  find(name: string, value: string): FakeElement | null {
    for (const node of this.childNodes) {
      if (!(node instanceof FakeElement)) {
        continue
      }

      if (node.getAttribute(name) === value) {
        return node
      }

      const below = node.find(name, value)

      if (below) {
        return below
      }
    }

    return null
  }
}

export class FakeDocument {
  readonly fonts = { add: () => undefined }

  createElement(tagName: string): FakeElement {
    return new FakeElement(this, tagName)
  }

  createTextNode(data: string): FakeText {
    return new FakeText(this, data)
  }
}

class QuietParser extends DOMParser {
  constructor() {
    super({ onError: () => {} })
  }
}

/** Timers the test runs by hand. */
export class FakeTimers {
  private readonly intervals = new Map<
    number,
    { every: number; run: () => void }
  >()

  private readonly timeouts: { id: number; at: number; run: () => void }[] = []

  private ids = 0

  now = 0

  setTimeout(run: () => void, ms: number): number {
    const id = (this.ids += 1)

    this.timeouts.push({ id, at: this.now + ms, run })

    return id
  }

  clearTimeout(id: number): void {
    const at = this.timeouts.findIndex((timeout) => timeout.id === id)

    if (at >= 0) {
      this.timeouts.splice(at, 1)
    }
  }

  setInterval(run: () => void, every: number): number {
    const id = (this.ids += 1)

    this.intervals.set(id, { every, run })

    return id
  }

  clearInterval(id: number): void {
    this.intervals.delete(id)
  }

  /** Moves time on by one interval tick of every interval, and runs every timeout that fell due. */
  tick(ms: number): void {
    this.now += ms
    this.timeouts
      .filter((timeout) => timeout.at <= this.now)
      .forEach((timeout) => {
        this.timeouts.splice(this.timeouts.indexOf(timeout), 1)
        timeout.run()
      })
    ;[...this.intervals.values()].forEach((interval) => {
      if (ms >= interval.every) {
        interval.run()
      }
    })
  }

  get pending(): number {
    return this.intervals.size
  }
}

/** Runs a document's code in a context of its own, as the frame's global scope would: what the scope was given is there by name, what it hides is undefined, and declarations stay for the next run. */
export function vmEvaluator(): Evaluate {
  const contexts = new WeakMap<
    object,
    { context: vm.Context; bindings: GlobalBindings }
  >()
  const contextOf = (scope: object) => {
    const held = contexts.get(scope)

    if (held) {
      return held
    }

    const context = vm.createContext({
      ...Object.fromEntries(SHADOWED_GLOBALS.map((name) => [name, undefined])),
      ...givenOf(scope),
    })
    const made = {
      context,
      bindings: globalBindingsOf(vm.runInContext('this', context) as object),
    }

    contexts.set(scope, made)

    return made
  }
  const evaluate: Evaluate = (code, scope) => {
    vm.runInContext(code, contextOf(scope).context)
  }

  evaluate.bindings = (scope) => contextOf(scope).bindings

  return evaluate
}

export interface FakeFrame {
  window: RuntimeWindow
  plane: FakeElement
  timers: FakeTimers
  said: unknown[]
  warnings: string[]
  parent: { postMessage: (message: unknown, origin: string) => void }
}

/** A frame the runtime can be started in: a window with the fakes above, whose parent collects what is posted to it. */
export function fakeFrame(playerOrigin: string): FakeFrame {
  const said: unknown[] = []
  const warnings: string[] = []
  const timers = new FakeTimers()
  const document = new FakeDocument()
  const parent = {
    postMessage: (message: unknown, origin: string) => {
      if (origin !== playerOrigin) {
        throw new Error(`posted to ${origin}`)
      }

      said.push(message)
    },
  }
  const window = {
    parent,
    DOMParser: QuietParser,
    innerWidth: 960,
    innerHeight: 540,
    console: { warn: (line: string) => warnings.push(line) },
    setTimeout: (run: () => void, ms: number) => timers.setTimeout(run, ms),
    clearTimeout: (id: number) => timers.clearTimeout(id),
    setInterval: (run: () => void, ms: number) => timers.setInterval(run, ms),
    clearInterval: (id: number) => timers.clearInterval(id),
    document,
  } as unknown as RuntimeWindow
  const plane = document.createElement('div')

  return { window, plane, timers, said, warnings, parent }
}
