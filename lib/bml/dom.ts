import type { Rect, Size } from '@/lib/caption-placement'
import type { PageElement, PageEvent } from '@/lib/bml/document'
import { eventItemsOf, type EventItem } from '@/lib/bml/events'
import type { Palette } from '@/lib/bml/palette'
import {
  BML_PROPERTIES,
  cssPairsOf,
  featuresOf,
  pixelsOf,
  withinPlane,
  type UsedKeyGroup,
} from '@/lib/bml/style'

export interface Stage {
  body: HTMLElement
  byId: Map<string, HTMLElement>
  nodes: Map<HTMLElement, PageElement>
  states: HTMLStyleElement
}

export interface DocumentHooks {
  moveFocus(element: HTMLElement | null): void
  navChanged(): void
  seenChanged(): void
  usedKeys(groups: UsedKeyGroup[]): void
  image(reference: string): string | null
  sentFor(element: HTMLElement, reference: string): boolean
  animate(element: HTMLElement, reference: string): void
  resolve(reference: string): string | null
  warn(message: string): void
}

export type StyleState = 'normal' | 'focus' | 'active'

export interface BmlEvent {
  type: string
  target: unknown
  keyCode?: number
  status?: number
  moduleRef?: string
  messageGroupId?: number
  messageId?: number
  messageVersion?: number
  privateData?: string
  esRef?: string
}

const ELEMENT_NODE = 1

const TEXT_NODE = 3

const SIDE_NAMES = new Set(['up', 'down', 'left', 'right'])

const QUIET_PROPERTIES = new Set(['grayscale-color-index'])

const STATE_MARK: Record<Exclude<StyleState, 'normal'>, string> = {
  focus: 'data-bml-focus',
  active: 'data-bml-active',
}

const PLACES_THE_VIDEO = new Set([
  'left',
  'top',
  'width',
  'height',
  'visibility',
  'display',
])

const INERT_ATTRIBUTES = new Set(['id', 'style', 'src', 'data', 'href'])

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
}

function isElement(node: Node | null | undefined): node is HTMLElement {
  return node?.nodeType === ELEMENT_NODE
}

function isText(node: Node | null | undefined): node is Text {
  return node?.nodeType === TEXT_NODE
}

class Inner {
  readonly stage: Stage

  readonly palette: Palette

  readonly hooks: DocumentHooks

  readonly items: EventItem[]

  readonly wrapped = new WeakMap<Node, BmlElement | BmlText>()

  readonly itemWrappers = new Map<EventItem, BmlEventItem>()

  readonly set = new Map<HTMLElement, Map<string, string>>()

  readonly rules = new Map<string, Map<string, string>>()

  readonly references = new Map<HTMLElement, string>()

  readonly videos: HTMLElement[]

  videoMoved = false

  focused: HTMLElement | null = null

  event: BmlEvent | null = null

  constructor(
    stage: Stage,
    palette: Palette,
    events: PageEvent[],
    hooks: DocumentHooks,
  ) {
    this.stage = stage
    this.palette = palette
    this.hooks = hooks
    this.items = eventItemsOf(events)
    this.videos = [...stage.nodes.keys()].filter(
      (element) => element.getAttribute('data-bml-video') !== null,
    )
  }

  wrap(node: Node | null | undefined): BmlElement | BmlText | null {
    if (isElement(node)) {
      return (
        this.wrapped.get(node) ??
        this.remember(node, new BmlElement(node, this))
      )
    }

    if (isText(node)) {
      return (
        this.wrapped.get(node) ?? this.remember(node, new BmlText(node, this))
      )
    }

    return null
  }

  private remember<T extends BmlElement | BmlText>(node: Node, wrapper: T): T {
    this.wrapped.set(node, wrapper)

    return wrapper
  }

  wrapElement(node: Node | null | undefined): BmlElement | null {
    const wrapper = this.wrap(node)

    return wrapper instanceof BmlElement ? wrapper : null
  }

  item(id: string): BmlEventItem | null {
    const item = this.items.find((each) => each.id === id)

    return item ? this.wrapItem(item) : null
  }

  wrapItem(item: EventItem): BmlEventItem {
    const wrapper = this.itemWrappers.get(item) ?? new BmlEventItem(item)

    this.itemWrappers.set(item, wrapper)

    return wrapper
  }

  styleOf(element: HTMLElement, state: StyleState, property: string): string {
    const set = this.set.get(element)?.get(`${state}:${property}`)

    if (set !== undefined) {
      return set
    }

    return state === 'normal'
      ? (this.stage.nodes.get(element)?.declarations[property] ?? '')
      : ''
  }

  restyle(
    element: HTMLElement,
    state: StyleState,
    property: string,
    value: string,
  ): void {
    const set = this.set.get(element) ?? new Map<string, string>()

    set.set(`${state}:${property}`, value)
    this.set.set(element, set)

    if (
      state === 'normal' &&
      PLACES_THE_VIDEO.has(property) &&
      this.videos.some((video) => this.upFrom(video).includes(element))
    ) {
      this.videoMoved = true
    }

    if (BML_PROPERTIES.has(property)) {
      this.feature(element, property, value)

      return
    }

    const converted = cssPairsOf(
      [{ property, value }],
      this.palette,
      (reference) => this.pictureUrl(reference),
    )

    converted.warnings.forEach((warning) => this.hooks.warn(warning))

    if (state === 'normal') {
      converted.pairs.forEach(([name, css]) =>
        element.style.setProperty(name, css),
      )

      return
    }

    this.rule(element, state, converted.pairs)
  }

  private upFrom(element: HTMLElement): HTMLElement[] {
    const chain: HTMLElement[] = []
    let at: Node | null = element

    while (isElement(at) && at !== this.stage.body) {
      chain.push(at)
      at = at.parentNode
    }

    return chain
  }

  private pixels(element: HTMLElement, property: string): number | null {
    return pixelsOf(this.styleOf(element, 'normal', property))
  }

  private rectOf(video: HTMLElement, resolution: Size): Rect | null {
    const width = this.pixels(video, 'width')
    const height = this.pixels(video, 'height')

    if (
      width === null ||
      height === null ||
      this.styleOf(video, 'normal', 'visibility') === 'hidden' ||
      this.styleOf(video, 'normal', 'display') === 'none'
    ) {
      return null
    }

    const placed = (property: string) =>
      this.upFrom(video).reduce(
        (sum, element) => sum + (this.pixels(element, property) ?? 0),
        0,
      )

    return withinPlane(
      { left: placed('left'), top: placed('top'), width, height },
      resolution,
    )
  }

  videoRect(resolution: Size): Rect | null {
    for (const video of this.videos) {
      const rect = this.rectOf(video, resolution)

      if (rect) {
        return rect
      }
    }

    return null
  }

  private rule(
    element: HTMLElement,
    state: Exclude<StyleState, 'normal'>,
    pairs: [string, string][],
  ): void {
    const n = element.getAttribute('data-bml-n')

    if (n === null) {
      return
    }

    const key = `${n}:${state}`
    const declarations = this.rules.get(key) ?? new Map<string, string>()

    pairs.forEach(([name, css]) => declarations.set(name, css))
    this.rules.set(key, declarations)
    this.stage.states.textContent = [...this.rules.entries()]
      .map(([each, body]) => {
        const [index, of] = each.split(':') as [string, 'focus' | 'active']
        const inside = [...body.entries()]
          .map(([name, css]) => `${name}: ${css}`)
          .join('; ')

        return `[data-bml-n="${index}"][${STATE_MARK[of]}] { ${inside} }`
      })
      .join('\n')
  }

  private pictureUrl(reference: string): string | null {
    const url = this.hooks.image(reference)

    if (!url) {
      this.hooks.warn(`missing image: ${reference}`)
    }

    return url
  }

  private feature(element: HTMLElement, property: string, value: string): void {
    const features = featuresOf(new Map([[property, value]]))
    const page = this.stage.nodes.get(element)

    if (QUIET_PROPERTIES.has(property)) {
      return
    }

    if (property === 'used-key-list') {
      if (features.usedKeys) {
        this.hooks.usedKeys(features.usedKeys)
      } else {
        this.hooks.warn('unsupported value of used-key-list')
      }

      return
    }

    const side = property.slice('nav-'.length)

    if (
      !page ||
      !property.startsWith('nav-') ||
      (side !== 'index' && !SIDE_NAMES.has(side))
    ) {
      this.hooks.warn(`unsupported property: ${property}`)

      return
    }

    const link = side as keyof PageElement['nav']
    const parsed = /^\d+$/.test(value.trim()) ? Number(value) : undefined

    page.nav[link] = parsed

    if (parsed === undefined) {
      element.removeAttribute(`data-bml-nav-${side}`)
    } else {
      element.setAttribute(`data-bml-nav-${side}`, String(parsed))
    }

    this.hooks.navChanged()
  }

  picture(element: HTMLElement, reference: string): void {
    this.references.set(element, reference)

    if (element.getAttribute('data-bml-tag') === null) {
      this.hooks.warn(`missing image: ${reference}`)

      return
    }

    if (this.hooks.sentFor(element, reference)) {
      return
    }

    if (element.tagName.toLowerCase() === 'canvas') {
      this.hooks.animate(element, reference)

      return
    }

    const url = this.hooks.image(reference)

    if (!url) {
      this.hooks.warn(`missing image: ${reference}`)

      return
    }

    if (element.tagName.toLowerCase() !== 'img') {
      this.hooks.warn('unsupported image')

      return
    }

    element.setAttribute('src', url)
  }
}

function styleProxy(
  inner: Inner,
  element: HTMLElement,
  state: StyleState,
): object {
  return new Proxy(Object.create(null) as Record<string, unknown>, {
    get(_, name) {
      return typeof name === 'string'
        ? inner.styleOf(element, state, kebab(name))
        : undefined
    },
    set(_, name, value) {
      if (typeof name === 'string') {
        inner.restyle(element, state, kebab(name), String(value))
      }

      return true
    },
  })
}

export class BmlText {
  readonly #node: Text

  readonly #inner: Inner

  constructor(node: Text, inner: Inner) {
    this.#node = node
    this.#inner = inner
  }

  get nodeType(): number {
    return TEXT_NODE
  }

  get nodeName(): string {
    return '#text'
  }

  get data(): string {
    return this.#node.data
  }

  set data(value: unknown) {
    this.#node.data = String(value)
  }

  get nodeValue(): string {
    return this.data
  }

  set nodeValue(value: unknown) {
    this.data = value
  }

  get parentNode(): BmlElement | null {
    return this.#inner.wrapElement(this.#node.parentNode)
  }
}

export class BmlElement {
  readonly #element: HTMLElement

  readonly #inner: Inner

  readonly #styles: Record<StyleState, object>

  constructor(element: HTMLElement, inner: Inner) {
    this.#element = element
    this.#inner = inner
    this.#styles = {
      normal: styleProxy(inner, element, 'normal'),
      focus: styleProxy(inner, element, 'focus'),
      active: styleProxy(inner, element, 'active'),
    }
  }

  get nodeType(): number {
    return ELEMENT_NODE
  }

  get tagName(): string {
    return (this.#element.getAttribute('data-bml-tag') ?? '').toUpperCase()
  }

  get nodeName(): string {
    return this.tagName
  }

  get id(): string {
    return this.#element.getAttribute('id') ?? ''
  }

  get className(): string {
    return this.#element.getAttribute('class') ?? ''
  }

  set className(value: unknown) {
    this.#element.setAttribute('class', String(value))
  }

  get parentNode(): BmlElement | null {
    return this.#inner.wrapElement(this.#element.parentNode)
  }

  get firstChild(): BmlElement | BmlText | null {
    return this.#inner.wrap(this.#element.firstChild)
  }

  get lastChild(): BmlElement | BmlText | null {
    return this.#inner.wrap(this.#element.lastChild)
  }

  get previousSibling(): BmlElement | BmlText | null {
    return this.#inner.wrap(this.#element.previousSibling)
  }

  get nextSibling(): BmlElement | BmlText | null {
    return this.#inner.wrap(this.#element.nextSibling)
  }

  get childNodes(): (BmlElement | BmlText)[] {
    return Array.from(this.#element.childNodes)
      .map((child) => this.#inner.wrap(child))
      .filter((child): child is BmlElement | BmlText => child !== null)
  }

  get invisible(): boolean {
    return this.#element.getAttribute('data-bml-attr-invisible') !== null
  }

  set invisible(value: unknown) {
    if (this.#element.getAttribute('data-bml-tag') !== 'body') {
      return
    }

    if (value) {
      this.#element.setAttribute('data-bml-attr-invisible', 'invisible')
    } else {
      this.#element.removeAttribute('data-bml-attr-invisible')
    }

    this.#inner.hooks.seenChanged()
  }

  get normalStyle(): object {
    return this.#styles.normal
  }

  get focusStyle(): object {
    return this.#styles.focus
  }

  get activeStyle(): object {
    return this.#styles.active
  }

  focus(): void {
    this.#inner.hooks.moveFocus(this.#element)
  }

  blur(): void {
    if (this.#inner.focused === this.#element) {
      this.#inner.hooks.moveFocus(null)
    }
  }

  get data(): string {
    return (
      this.#inner.references.get(this.#element) ??
      this.#element.getAttribute('data-bml-ref') ??
      ''
    )
  }

  set data(reference: unknown) {
    this.#inner.picture(this.#element, String(reference))
  }

  get src(): string {
    return this.data
  }

  set src(reference: unknown) {
    this.data = reference
  }

  get href(): string {
    return this.#element.getAttribute('data-bml-href') ?? ''
  }

  set href(reference: unknown) {
    const path = this.#inner.hooks.resolve(String(reference))

    if (path) {
      this.#element.setAttribute('data-bml-href', path)
    } else {
      this.#element.removeAttribute('data-bml-href')
    }
  }

  get value(): string {
    return this.#element.getAttribute('value') ?? ''
  }

  set value(value: unknown) {
    this.#element.setAttribute('value', String(value))
  }

  get type(): string {
    return this.getAttribute('type') ?? ''
  }

  getAttribute(name: unknown): string | null {
    if (typeof name !== 'string') {
      return null
    }

    const lowered = name.toLowerCase()

    switch (lowered) {
      case 'id':
      case 'class':
        return this.#element.getAttribute(lowered)
      case 'href':
        return this.href
      case 'src':
      case 'data':
        return this.data
      default:
        return this.#element.getAttribute(`data-bml-attr-${lowered}`)
    }
  }

  setAttribute(name: unknown, value: unknown): void {
    if (typeof name !== 'string') {
      return
    }

    const lowered = name.toLowerCase()

    if (lowered === 'class') {
      this.className = value
    } else if (
      !INERT_ATTRIBUTES.has(lowered) &&
      /^[a-z][a-z0-9_-]*$/.test(lowered)
    ) {
      this.#element.setAttribute(`data-bml-attr-${lowered}`, String(value))
    }
  }
}

const ITEM_PROPERTIES: Record<string, { attribute: string; number: boolean }> =
  {
    esRef: { attribute: 'es_ref', number: false },
    moduleRef: { attribute: 'module_ref', number: false },
    peripheralRef: { attribute: 'peripheral_ref', number: false },
    languageCode: { attribute: 'language_code', number: false },
    timeMode: { attribute: 'time_mode', number: false },
    timeValue: { attribute: 'time_value', number: false },
    objectId: { attribute: 'object_id', number: false },
    segmentId: { attribute: 'segment_id', number: false },
    messageGroupId: { attribute: 'message_group_id', number: true },
    messageId: { attribute: 'message_id', number: true },
    messageVersion: { attribute: 'message_version', number: true },
    registerId: { attribute: 'register_id', number: true },
    serviceId: { attribute: 'service_id', number: true },
    eventId: { attribute: 'event_id', number: true },
  }

export class BmlEventItem {
  readonly #item: EventItem

  constructor(item: EventItem) {
    this.#item = item
  }

  get nodeType(): number {
    return ELEMENT_NODE
  }

  get tagName(): string {
    return 'BEITEM'
  }

  get id(): string {
    return this.#item.id ?? ''
  }

  get type(): string {
    return this.#item.type ?? this.#item.attributes.get('type') ?? ''
  }

  get subscribe(): boolean {
    return this.#item.subscribed
  }

  set subscribe(value: unknown) {
    this.#item.subscribed = Boolean(value)
  }

  getAttribute(name: unknown): string | null {
    return typeof name === 'string'
      ? (this.#item.attributes.get(name.toLowerCase()) ?? null)
      : null
  }

  setAttribute(name: unknown, value: unknown): void {
    if (typeof name === 'string' && /^[a-z][a-z0-9_]*$/i.test(name)) {
      this.#item.attributes.set(name.toLowerCase(), String(value))
    }
  }
}

Object.entries(ITEM_PROPERTIES).forEach(([name, { attribute, number }]) => {
  Object.defineProperty(BmlEventItem.prototype, name, {
    enumerable: true,
    get(this: BmlEventItem): string | number | null {
      const value = this.getAttribute(attribute)

      if (value === null) {
        return number ? Number.NaN : null
      }

      return number ? Number(value) : value
    },
    set(this: BmlEventItem, value: unknown) {
      this.setAttribute(attribute, value)
    },
  })
})

export class ScriptedDocument {
  readonly #inner: Inner

  constructor(inner: Inner) {
    this.#inner = inner
  }

  getElementById(id: unknown): BmlElement | BmlEventItem | null {
    if (typeof id !== 'string') {
      return null
    }

    const element = this.#inner.stage.byId.get(id)

    return element ? this.#inner.wrapElement(element) : this.#inner.item(id)
  }

  get currentFocus(): BmlElement | null {
    return this.#inner.wrapElement(this.#inner.focused)
  }

  get currentEvent(): BmlEvent | null {
    return this.#inner.event
  }
}

export class BmlDocument {
  private readonly inner: Inner

  readonly scripted: ScriptedDocument

  constructor(
    stage: Stage,
    palette: Palette,
    events: PageEvent[],
    hooks: DocumentHooks,
  ) {
    this.inner = new Inner(stage, palette, events, hooks)
    this.scripted = new ScriptedDocument(this.inner)
  }

  get items(): readonly EventItem[] {
    return this.inner.items
  }

  get focused(): HTMLElement | null {
    return this.inner.focused
  }

  focusedIs(element: HTMLElement | null): void {
    this.inner.focused = element
  }

  cannotBeSeen(): boolean {
    const body = this.inner.stage.body

    return (
      body.getAttribute('data-bml-attr-invisible') !== null ||
      this.inner.styleOf(body, 'normal', 'visibility') === 'hidden'
    )
  }

  movedVideoRect(resolution: Size): Rect | null | undefined {
    if (!this.inner.videoMoved) {
      return undefined
    }

    this.inner.videoMoved = false

    return this.inner.videoRect(resolution)
  }

  pictureCame(element: HTMLElement): void {
    const reference = this.inner.references.get(element)

    if (reference !== undefined) {
      this.inner.picture(element, reference)
    }
  }

  elementTarget(element: HTMLElement | null): BmlElement | null {
    return this.inner.wrapElement(element)
  }

  itemTarget(item: EventItem): BmlEventItem {
    return this.inner.wrapItem(item)
  }

  during<T>(event: BmlEvent, act: () => T): T {
    const before = this.inner.event

    this.inner.event = event

    try {
      return act()
    } finally {
      this.inner.event = before
    }
  }
}
