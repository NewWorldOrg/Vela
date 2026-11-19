import vm from 'node:vm'
import { DOMParser } from '@xmldom/xmldom'

import {
  globalBindingsOf,
  hidingOn,
  SHADOWED_GLOBALS,
  type Evaluate,
  type GlobalBindings,
  type Hiding,
} from '@/lib/bml/scripts'
import { SCOPE_NAME } from '@/components/data-broadcast/bml-evaluator'
import type { RuntimeWindow } from '@/components/data-broadcast/bml-runtime'

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

  get isConnected(): boolean {
    let node: FakeNode = this

    while (node.parentNode) {
      node = node.parentNode
    }

    return node === this.ownerDocument.root
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

  get text(): string {
    return this.childNodes
      .map((node) =>
        node instanceof FakeText ? node.data : (node as FakeElement).text,
      )
      .join('')
  }

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

export class FakeBitmap {
  readonly name: string

  readonly width = 1

  readonly height = 1

  closed = false

  constructor(name: string) {
    this.name = name
  }

  close(): void {
    this.closed = true
  }
}

export class FakeSurface {
  readonly drawn: string[] = []

  private box = ''

  clearRect(x: number, y: number, width: number, height: number): void {
    this.drawn.push(`clear ${x},${y},${width},${height}`)
  }

  save(): void {}

  restore(): void {
    this.box = ''
  }

  beginPath(): void {}

  rect(x: number, y: number, width: number, height: number): void {
    this.box = `${x},${y},${width},${height}`
  }

  clip(): void {}

  drawImage(image: FakeBitmap, x: number, y: number): void {
    this.drawn.push(`${image.name} at ${x},${y} in ${this.box}`)
  }
}

export class FakeCanvas extends FakeElement {
  width = 300

  height = 150

  readonly surface = new FakeSurface()

  getContext(kind: string): FakeSurface | null {
    return kind === '2d' ? this.surface : null
  }
}

export class FakeDocument {
  readonly fonts = { add: () => undefined }

  root: FakeElement | null = null

  createElement(tagName: string): FakeElement {
    return tagName === 'canvas'
      ? new FakeCanvas(this, tagName)
      : new FakeElement(this, tagName)
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

  get waiting(): number {
    return this.timeouts.length
  }

  get pending(): number {
    return this.intervals.size
  }
}

const UNCONFIGURABLE = new Set(['window', 'top', 'location'])

const READ_ONLY = new Set([
  'history',
  'navigator',
  'performance',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'caches',
  'customElements',
])

function standInsOn(global: object): void {
  SHADOWED_GLOBALS.filter((name) => !(name in global)).forEach((name) => {
    const framesOwn = Object.freeze({ framesOwn: name })

    Object.defineProperty(
      global,
      name,
      UNCONFIGURABLE.has(name) || READ_ONLY.has(name)
        ? {
            get: () => framesOwn,
            enumerable: true,
            configurable: !UNCONFIGURABLE.has(name),
          }
        : { value: framesOwn, writable: true, configurable: true },
    )
  })
}

export function vmEvaluator(): Evaluate {
  const contexts = new WeakMap<
    object,
    { context: vm.Context; bindings: GlobalBindings; hiding: Hiding }
  >()
  const contextOf = (scope: object) => {
    const held = contexts.get(scope)

    if (held) {
      return held
    }

    const context = vm.createContext({ [SCOPE_NAME]: scope })
    const global = vm.runInContext('this', context) as object

    standInsOn(global)

    const made = {
      context,
      bindings: globalBindingsOf(global),
      hiding: hidingOn(global),
    }

    contexts.set(scope, made)

    return made
  }
  const evaluate: Evaluate = (code, scope) => {
    const { context, hiding } = contextOf(scope)

    hiding(scope, () =>
      vm.runInContext(`with (${SCOPE_NAME}) {\n${code}\n}`, context),
    )
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

  document.root = plane

  return { window, plane, timers, said, warnings, parent }
}
