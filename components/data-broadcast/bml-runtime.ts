import {
  browserOf,
  registersOf,
  type BrowserHost,
  type LockAnswer,
} from '@/lib/bml/browser'
import { staysListed, takesThePlace, type BmlCatalog } from '@/lib/bml/catalog'
import {
  BML_LIMITS,
  convertBml,
  parseBml,
  type BmlPage,
  type XmlParser,
} from '@/lib/bml/document'
import { BmlDocument, type BmlEvent, type DocumentHooks } from '@/lib/bml/dom'
import type { BroadcastEvent } from '@/lib/bml/event-message'
import {
  listening,
  listensFor,
  namesModule,
  privateDataOf,
  type EventItem,
  type EventType,
} from '@/lib/bml/events'
import {
  BML_KEY_CODE,
  answerTo,
  firstFocus,
  keysOf,
  navigationOf,
  type BmlKey,
  type Navigation,
} from '@/lib/bml/keys'
import { PersistentMemory } from '@/lib/bml/memory'
import {
  playerMessageFrom,
  type FontBytes,
  type PlayerMessage,
  type Programme,
  type RuntimeError,
  type RuntimeMessage,
} from '@/lib/bml/messages'
import { withPalette, type Palette } from '@/lib/bml/palette'
import {
  addressOf,
  moduleAddressOf,
  modulePathOf,
  pathOf,
  resolveReference,
  type BmlAddress,
} from '@/lib/bml/paths'
import type { BmlModule, BmlResource } from '@/lib/bml/resources'
import { PLANE_ID, PLAYER_ORIGIN_META } from '@/lib/bml/runtime-document'
import {
  MOST_RUN_MS,
  ScriptScope,
  scopeOf,
  type Evaluate,
} from '@/lib/bml/scripts'
import { onGrid, planeIn, type UsedKeyGroup } from '@/lib/bml/style'
import { tableClassesOf } from '@/lib/bml/tables'
import { frameEvaluator } from '@/components/data-broadcast/bml-evaluator'
import {
  mountPage,
  type MountedPage,
} from '@/components/data-broadcast/bml-page'

const ACTIVE_MS = 150

/** How many documents may follow one another before the event loop is let through again. */
const MOST_LAUNCHES_IN_A_ROW = 16

const MOST_TIMERS = 64

const LEAST_INTERVAL_MS = 10

const MOST_SLEEP_MS = 1000

const IMAGE_TYPE: Partial<Record<BmlResource['kind'], string>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
}

export type RuntimeWindow = Window & typeof globalThis

export type Mount = (page: BmlPage, plane: HTMLElement) => MountedPage

export interface RuntimeOptions {
  mount?: Mount
  evaluate?: Evaluate
  now?: () => number
}

interface Shown {
  page: BmlPage
  mounted: MountedPage
  document: BmlDocument
  scope: ScriptScope
  navigation: Navigation
  focused: number | null
  urls: string[]
  usedKeys: UsedKeyGroup[]
}

interface Timer {
  handle: number
  left: number | null
}

type Leaving = { to: BmlAddress } | { reload: true }

function moduleKey(tag: number, id: number): string {
  return `${tag}/${id}`
}

function handlerOf(element: HTMLElement, name: string): string | null {
  return element.getAttribute(`data-bml-attr-${name}`)
}

/** The runtime inside the sandboxed frame: it keeps the modules the player hands it, draws the document it is asked to open, runs the document's scripts and answers keys and events. */
export class BmlRuntime {
  private readonly window: RuntimeWindow

  private readonly plane: HTMLElement

  private readonly playerOrigin: string

  private readonly parser: XmlParser

  private readonly modules = new Map<string, BmlModule>()

  private readonly locked = new Set<string>()

  private readonly timers = new Map<number, Timer>()

  private readonly registers = { Ureg: registersOf(), Greg: registersOf() }

  private readonly memory: PersistentMemory

  private readonly mount: Mount

  private readonly evaluate: Evaluate

  private readonly now: () => number

  private catalog: BmlCatalog | null = null

  private shown: Shown | null = null

  private pending: BmlAddress | null = null

  private leaving: Leaving | null = null

  private depth = 0

  private settling = false

  private timerIds = 0

  clock: number | null = null

  programme: Programme | null = null

  constructor(
    window: RuntimeWindow,
    plane: HTMLElement,
    playerOrigin: string,
    options: RuntimeOptions = {},
  ) {
    this.window = window
    this.plane = plane
    this.playerOrigin = playerOrigin
    this.parser = new window.DOMParser() as unknown as XmlParser
    this.mount = options.mount ?? mountPage
    this.evaluate = options.evaluate ?? frameEvaluator(window)
    this.now = options.now ?? (() => Date.now())
    this.memory = new PersistentMemory((name, value) =>
      this.say({ kind: 'memory', name, value }),
    )
  }

  receive(event: MessageEvent): void {
    const message = playerMessageFrom(
      { origin: event.origin, source: event.source, data: event.data },
      { origin: this.playerOrigin, window: this.window.parent },
    )

    if (message) {
      this.take(message)
    }
  }

  private take(message: PlayerMessage): void {
    switch (message.kind) {
      case 'catalog':
        this.catalogue(message.catalog)
        return
      case 'module':
        this.keep(message.module)
        return
      case 'font':
        message.fonts.forEach((font) => this.load(font))
        return
      case 'key':
        this.press(message.key)
        return
      case 'clock':
        this.clock = message.seconds
        return
      case 'programme':
        this.programme = message.programme
        return
      case 'memory':
        this.memory.take(message.entries)
        return
      case 'event':
        this.fired(message.event)
        return
      case 'open':
        this.open()
        return
      case 'close':
        this.close()
        return
    }
  }

  private catalogue(catalog: BmlCatalog): void {
    const gone: BmlModule[] = []

    this.modules.forEach((module, key) => {
      if (!staysListed(catalog, module.tag, module.id)) {
        this.modules.delete(key)
        this.locked.delete(key)
        gone.push(module)
      }
    })
    this.catalog = catalog
    gone.forEach((module) => this.moduleChanged(module, 1))
  }

  private keep(module: BmlModule): void {
    const key = moduleKey(module.tag, module.id)
    const held = this.modules.get(key)

    if (!takesThePlace(this.catalog, held, module)) {
      return
    }

    this.modules.set(key, module)

    const pending = this.pending

    if (pending && pending.tag === module.tag && pending.module === module.id) {
      this.launch(pending, false)

      return
    }

    if (held && held.version !== module.version) {
      this.moduleChanged(module, 0)
    }

    if (this.locked.has(key)) {
      this.moduleLocked(module)
    }
  }

  private load(font: FontBytes): void {
    const face = new FontFace(font.family, font.bytes)

    face
      .load()
      .then((loaded) => this.window.document.fonts.add(loaded))
      .catch(() => this.warn('font did not load'))
  }

  lookup(address: BmlAddress): BmlResource | undefined {
    return this.modules
      .get(moduleKey(address.tag, address.module))
      ?.resources.find((resource) => resource.path === address.name)
  }

  private open(): void {
    const startup = this.catalog ? addressOf(this.catalog.startup) : null

    if (!startup) {
      this.fail('missing')

      return
    }

    this.launch(startup, true)
    this.dataButtonPressed()
  }

  private close(): void {
    this.waitFor(null)
    this.unmount()
  }

  private launch(address: BmlAddress, opening: boolean): void {
    const arrived = this.modules.has(moduleKey(address.tag, address.module))

    if (!arrived && !opening) {
      this.waitFor(address)

      return
    }

    const resource = this.lookup(address)

    if (!resource) {
      this.fail('missing')

      return
    }

    this.waitFor(null)

    if (resource.kind !== 'bml') {
      this.fail(resource.kind === 'undecoded' ? 'undecoded' : 'malformed')

      return
    }

    this.show(address, resource)
  }

  private show(address: BmlAddress, resource: BmlResource): void {
    const urls: string[] = []

    try {
      const page = this.read(address, resource, urls)

      if (!page) {
        this.discard(urls)
        this.fail('malformed')

        return
      }

      this.draw(page, urls)
    } catch {
      this.discard(urls)
      this.fail('malformed')
    }
  }

  private read(
    address: BmlAddress,
    resource: BmlResource,
    urls: string[],
  ): BmlPage | null {
    if (resource.body.length > BML_LIMITS.documentBytes) {
      return null
    }

    const root = parseBml(new TextDecoder().decode(resource.body), this.parser)
    const reading = root
      ? convertBml(root, {
          address,
          lookup: (wanted) => this.lookup(wanted),
          image: (image, palette) => this.urlOf(image, palette, urls),
        })
      : null

    return reading?.read === 'page' ? reading.page : null
  }

  private draw(page: BmlPage, urls: string[]): void {
    this.unmount()
    page.warnings.forEach((warning) => this.warn(warning))

    const mounted = this.mount(page, this.plane)
    const document = new BmlDocument(
      {
        body: mounted.body,
        byId: mounted.byId,
        nodes: mounted.nodes,
        states: mounted.states,
      },
      page.palette,
      page.events,
      this.hooks(),
    )
    const shown: Shown = {
      page,
      mounted,
      document,
      scope: new ScriptScope(
        this.evaluate,
        scopeOf(this.globalsOf(document)),
        this.now,
      ),
      navigation: navigationOf(page.body),
      focused: null,
      urls,
      usedKeys: page.usedKeys,
    }

    this.shown = shown
    this.fit()
    this.start(shown)
  }

  /** Runs the document's scripts and its body's `onload`, then settles its focus and tells the player of it, unless a script moved on. */
  private start(shown: Shown): void {
    for (const script of shown.page.scripts) {
      const code =
        'source' in script ? script.source : this.scriptAt(script.src)

      if (code === null) {
        this.warn('missing script')
      } else if (!this.execute(code, null) || this.shown !== shown) {
        return
      }
    }

    const onload = handlerOf(shown.mounted.body, 'onload')

    if (
      onload &&
      (!this.execute(onload, { type: 'load', target: null }) ||
        this.shown !== shown)
    ) {
      return
    }

    this.focus(firstFocus(shown.navigation), false)
    this.say({
      kind: 'videoRect',
      rect: shown.page.videoRect
        ? onGrid(shown.page.videoRect, shown.page.resolution, shown.page.aspect)
        : null,
    })
    this.say({ kind: 'usedKeys', keys: keysOf(shown.usedKeys) })
  }

  private scriptAt(path: string): string | null {
    const address = addressOf(path)
    const resource = address ? this.lookup(address) : undefined

    return resource &&
      (resource.kind === 'script' || resource.kind === 'undecoded')
      ? new TextDecoder().decode(resource.body)
      : null
  }

  private globalsOf(document: BmlDocument): Record<string, unknown> {
    const tables = tableClassesOf((reference) => {
      const resource =
        typeof reference === 'string' ? this.resourceOf(reference) : undefined

      return resource
        ? { body: resource.body, text: resource.kind !== 'binary' }
        : null
    })

    return {
      document: document.scripted,
      browser: browserOf(this.host()),
      BinaryTable: tables.BinaryTable,
      CSVTable: tables.CSVTable,
    }
  }

  private resourceOf(reference: string): BmlResource | undefined {
    const base = this.shown?.page.address
    const address = base ? resolveReference(reference, base) : null

    return address ? this.lookup(address) : undefined
  }

  private hooks(): DocumentHooks {
    return {
      moveFocus: (element) => this.focusOn(element),
      navChanged: () => this.renavigate(),
      usedKeys: (groups) => {
        if (this.shown) {
          this.shown.usedKeys = groups
          this.say({ kind: 'usedKeys', keys: keysOf(groups) })
        }
      },
      image: (reference) => {
        const resource = this.resourceOf(reference)
        const shown = this.shown

        return resource && shown
          ? this.urlOf(resource, shown.page.palette, shown.urls)
          : null
      },
      resolve: (reference) => {
        const base = this.shown?.page.address
        const address = base ? resolveReference(reference, base) : null

        return address ? pathOf(address) : null
      },
      warn: (message) => this.warn(message),
    }
  }

  private host(): BrowserHost {
    return {
      launch: (reference) => this.leave(reference),
      reload: () => {
        this.leaving = { reload: true }
      },
      activeDocument: () =>
        this.shown ? pathOf(this.shown.page.address) : null,
      relativeTime: () => this.relativeTime(),
      npt: () => null,
      programme: () => this.programme,
      memory: this.memory,
      registers: this.registers,
      startTimer: (code, everyMs, times) =>
        this.startTimer(code, everyMs, times),
      stopTimer: (id) => this.stopTimer(id),
      sleep: (ms) => this.sleep(ms),
      lock: (reference) => this.lock(reference),
      unlock: (reference) => this.unlock(reference),
      lockedModules: () =>
        [...this.modules.values()]
          .filter((module) => this.locked.has(moduleKey(module.tag, module.id)))
          .map((module) => modulePathOf(module.tag, module.id)),
      unsupported: (what) => this.say({ kind: 'unsupported', what }),
      warn: (what) => this.warn(what),
    }
  }

  private relativeTime(): number | null {
    const startsAt = this.programme?.startsAt

    if (typeof startsAt !== 'number') {
      return null
    }

    const at = this.clock ?? Date.now() / 1000

    return Math.max(0, Math.floor(at - startsAt))
  }

  private leave(reference: unknown): boolean {
    const base = this.shown?.page.address
    const address =
      typeof reference === 'string' && base
        ? resolveReference(reference, base)
        : null

    if (!address) {
      return false
    }

    this.leaving = { to: address }

    return true
  }

  /** Runs one piece of the document's code, telling the player when it starts and ends so that one that runs too long is seen. True when the document is still the one shown and has not asked to move on. */
  private execute(code: string, event: BmlEvent | null): boolean {
    const shown = this.shown

    if (!shown) {
      return false
    }

    this.say({ kind: 'script', state: 'running' })
    this.depth += 1

    const outcome =
      event === null
        ? shown.scope.run(code)
        : shown.document.during(event, () => shown.scope.run(code))

    this.depth -= 1
    this.say({
      kind: 'script',
      state: outcome.tookMs > MOST_RUN_MS ? 'overran' : 'done',
    })

    if (outcome.outcome === 'failed') {
      this.warn(`script failed: ${nameOf(outcome.error)}`)
    }

    if (this.depth === 0) {
      this.settle()
    }

    return this.shown === shown && this.leaving === null
  }

  /** Moves to the document a script asked for, once the script has ended; a document that moves on at once from its own scripts is followed only so far. */
  private settle(): void {
    if (this.settling) {
      return
    }

    this.settling = true

    let launches = 0

    while (this.leaving && launches < MOST_LAUNCHES_IN_A_ROW) {
      const leaving = this.leaving

      this.leaving = null
      launches += 1

      if ('reload' in leaving) {
        this.reload()
      } else {
        this.launch(leaving.to, false)
      }
    }

    this.settling = false

    if (this.leaving) {
      this.leaving = null
      this.fail('malformed')
    }
  }

  private reload(): void {
    const address = this.shown?.page.address

    if (address) {
      this.launch(address, false)
    }
  }

  private occur(
    type: EventType,
    fields: Partial<BmlEvent>,
    picks: (item: EventItem) => boolean = () => true,
  ): void {
    const shown = this.shown

    if (!shown) {
      return
    }

    for (const item of listening(shown.document.items, type).filter(picks)) {
      const onoccur = item.attributes.get('onoccur') ?? ''
      const event: BmlEvent = {
        ...fields,
        type,
        target: shown.document.itemTarget(item),
      }

      if (!this.execute(onoccur, event) || this.shown !== shown) {
        return
      }
    }
  }

  private dataButtonPressed(): void {
    const shown = this.shown

    if (!shown) {
      return
    }

    if (listening(shown.document.items, 'DataButtonPressed').length > 0) {
      this.occur('DataButtonPressed', {})

      return
    }

    this.keyTo(shown, 'keydown', 'd')
  }

  private moduleChanged(module: BmlModule, status: number): void {
    const base = this.shown?.page.address

    if (base) {
      this.occur(
        'ModuleUpdated',
        { status, moduleRef: modulePathOf(module.tag, module.id) },
        (item) => namesModule(item, base, module),
      )
    }
  }

  private moduleLocked(module: BmlModule): void {
    const base = this.shown?.page.address

    if (base) {
      this.occur(
        'ModuleLocked',
        { status: 0, moduleRef: modulePathOf(module.tag, module.id) },
        (item) => namesModule(item, base, module),
      )
    }
  }

  private fired(event: BroadcastEvent): void {
    this.occur(
      'EventMessageFired',
      {
        messageGroupId: event.group,
        messageId: event.id,
        messageVersion: event.type,
        privateData: privateDataOf(event.privateData),
      },
      (item) => listensFor(item, event),
    )
  }

  private lock(reference: unknown): LockAnswer {
    const base = this.shown?.page.address
    const address =
      typeof reference === 'string' && base
        ? moduleAddressOf(reference, base)
        : null

    if (!address) {
      return 'bad'
    }

    const key = moduleKey(address.tag, address.module)
    const held = this.modules.get(key)

    this.locked.add(key)

    if (!held) {
      return 'waiting'
    }

    this.window.setTimeout(() => {
      if (this.locked.has(key)) {
        this.moduleLocked(held)
      }
    }, 0)

    return 'held'
  }

  private unlock(reference: unknown): void {
    const base = this.shown?.page.address

    if (reference === null) {
      this.locked.clear()

      return
    }

    const address =
      typeof reference === 'string' && base
        ? moduleAddressOf(reference, base)
        : null

    if (address) {
      this.locked.delete(moduleKey(address.tag, address.module))
    }
  }

  private startTimer(code: unknown, everyMs: unknown, times: unknown): number {
    if (
      typeof code !== 'string' ||
      typeof everyMs !== 'number' ||
      !Number.isFinite(everyMs) ||
      this.timers.size >= MOST_TIMERS
    ) {
      return Number.NaN
    }

    const id = (this.timerIds += 1)
    const left =
      typeof times === 'number' && Number.isFinite(times) && times >= 1
        ? Math.floor(times)
        : null
    const handle = this.window.setInterval(
      () => this.tick(id, code),
      Math.max(LEAST_INTERVAL_MS, everyMs),
    )

    this.timers.set(id, { handle, left })

    return id
  }

  private tick(id: number, code: string): void {
    const timer = this.timers.get(id)

    if (!timer) {
      return
    }

    if (timer.left !== null) {
      timer.left -= 1

      if (timer.left <= 0) {
        this.stopTimer(id)
      }
    }

    this.execute(code, { type: 'TimerFired', target: null })
  }

  private stopTimer(id: unknown): boolean {
    const timer = typeof id === 'number' ? this.timers.get(id) : undefined

    if (!timer) {
      return false
    }

    this.window.clearInterval(timer.handle)
    this.timers.delete(id as number)

    return true
  }

  private stopTimers(): void {
    this.timers.forEach((timer) => this.window.clearInterval(timer.handle))
    this.timers.clear()
  }

  private sleep(ms: unknown): void {
    const wanted = typeof ms === 'number' && Number.isFinite(ms) ? ms : 0
    const until = this.now() + Math.min(MOST_SLEEP_MS, Math.max(0, wanted))

    while (this.now() < until) {
      continue
    }
  }

  private discard(urls: string[]): void {
    urls.forEach((url) => URL.revokeObjectURL(url))
  }

  private urlOf(
    resource: BmlResource,
    palette: Palette,
    urls: string[],
  ): string | null {
    const type = IMAGE_TYPE[resource.kind]

    if (!type) {
      return null
    }

    const bytes =
      resource.kind === 'png'
        ? withPalette(resource.body, palette)
        : resource.body
    const url = URL.createObjectURL(new Blob([bytes.slice()], { type }))

    urls.push(url)

    return url
  }

  private unmount(): void {
    this.stopTimers()
    this.locked.clear()
    this.shown?.urls.forEach((url) => URL.revokeObjectURL(url))
    this.shown = null
    this.plane.replaceChildren()
  }

  fit(): void {
    const page = this.shown?.page

    if (!page) {
      return
    }

    const plane = planeIn(
      { width: this.window.innerWidth, height: this.window.innerHeight },
      page.resolution,
      page.aspect,
    )

    this.plane.style.left = `${plane.left}px`
    this.plane.style.top = `${plane.top}px`
    this.plane.style.transform = `scale(${plane.scaleX}, ${plane.scaleY})`
  }

  private renavigate(): void {
    const shown = this.shown

    if (!shown) {
      return
    }

    shown.navigation = navigationOf(shown.page.body)
    shown.mounted.byNavIndex.clear()
    shown.mounted.nodes.forEach((node, element) => {
      if (
        node.nav.index !== undefined &&
        !shown.mounted.byNavIndex.has(node.nav.index)
      ) {
        shown.mounted.byNavIndex.set(node.nav.index, element)
      }
    })
  }

  private focusOn(element: HTMLElement | null): void {
    const shown = this.shown

    if (!shown) {
      return
    }

    const index =
      element === null
        ? null
        : (shown.mounted.nodes.get(element)?.nav.index ?? null)

    if (
      element !== null &&
      (index === null || shown.mounted.byNavIndex.get(index) !== element)
    ) {
      return
    }

    this.focus(index, true)
  }

  /** Moves the focus, running `onblur` on the element it leaves and `onfocus` on the one it reaches when asked to. */
  private focus(index: number | null, telling: boolean): void {
    const shown = this.shown

    if (!shown) {
      return
    }

    const from =
      shown.focused === null
        ? undefined
        : shown.mounted.byNavIndex.get(shown.focused)
    const to = index === null ? undefined : shown.mounted.byNavIndex.get(index)
    const onblur = from && telling ? handlerOf(from, 'onblur') : null

    if (
      onblur &&
      (!this.execute(onblur, {
        type: 'blur',
        target: shown.document.elementTarget(from ?? null),
      }) ||
        this.shown !== shown)
    ) {
      return
    }

    from?.removeAttribute('data-bml-focus')
    to?.setAttribute('data-bml-focus', '')
    shown.focused = index
    shown.document.focusedIs(to ?? null)

    const onfocus = to && telling ? handlerOf(to, 'onfocus') : null

    if (onfocus) {
      this.execute(onfocus, {
        type: 'focus',
        target: shown.document.elementTarget(to ?? null),
      })
    }
  }

  private press(key: BmlKey): void {
    const shown = this.shown

    if (!shown) {
      return
    }

    if (!this.keyTo(shown, 'keydown', key)) {
      return
    }

    const answer = answerTo(key, shown.navigation, shown.focused)

    if (answer.answer === 'moved') {
      this.focus(answer.to, true)
    } else if (answer.answer === 'decided') {
      this.decide(shown.mounted.byNavIndex.get(answer.on))
    } else if (answer.answer === 'pressed') {
      this.accessKey(shown, key)
    }

    if (this.shown === shown) {
      this.keyTo(shown, 'keyup', key)
    }
  }

  /** Hands a key to the focused element's handler. True when the document stays to take the key's own effect. */
  private keyTo(
    shown: Shown,
    phase: 'keydown' | 'keyup',
    key: BmlKey,
  ): boolean {
    const focused =
      shown.focused === null
        ? undefined
        : shown.mounted.byNavIndex.get(shown.focused)
    const handler = focused ? handlerOf(focused, `on${phase}`) : null

    if (!focused || !handler) {
      return true
    }

    return (
      this.execute(handler, {
        type: phase,
        target: shown.document.elementTarget(focused),
        keyCode: BML_KEY_CODE[key],
      }) && this.shown === shown
    )
  }

  private accessKey(shown: Shown, key: BmlKey): void {
    for (const [index, element] of shown.mounted.byNavIndex) {
      if (handlerOf(element, 'accesskey') === key) {
        this.focus(index, true)

        return
      }
    }
  }

  private decide(element: HTMLElement | undefined): void {
    const shown = this.shown

    if (!element || !shown) {
      return
    }

    element.setAttribute('data-bml-active', '')
    this.window.setTimeout(
      () => element.removeAttribute('data-bml-active'),
      ACTIVE_MS,
    )

    const handler = handlerOf(element, 'onclick')
    const href = element.getAttribute('data-bml-href')
    const target = href ? addressOf(href) : null

    if (
      handler &&
      (!this.execute(handler, {
        type: 'click',
        target: shown.document.elementTarget(element),
      }) ||
        this.shown !== shown)
    ) {
      return
    }

    if (target) {
      this.launch(target, false)
    }
  }

  private waitFor(address: BmlAddress | null): void {
    const was = this.pending !== null

    this.pending = address

    if (was !== (address !== null)) {
      this.say({ kind: 'waiting', waiting: address !== null })
    }
  }

  private fail(reason: RuntimeError): void {
    this.waitFor(null)
    this.unmount()
    this.say({ kind: 'error', reason })
  }

  private warn(warning: string): void {
    this.window.console.warn(`data broadcast: ${warning}`)
  }

  private say(message: RuntimeMessage): void {
    this.window.parent.postMessage(message, this.playerOrigin)
  }
}

function nameOf(error: unknown): string {
  return error instanceof Error ? error.name : 'Error'
}

/** Starts the runtime in the frame's own window, taking messages only from the origin written into its document. */
export function startBmlRuntime(window: RuntimeWindow): BmlRuntime | null {
  const document = window.document
  const plane = document.getElementById(PLANE_ID)
  const origin = document
    .querySelector(`meta[name="${PLAYER_ORIGIN_META}"]`)
    ?.getAttribute('content')

  if (!plane || !origin) {
    return null
  }

  const runtime = new BmlRuntime(window, plane, origin, {
    now: () => window.performance.now(),
  })

  window.addEventListener('message', (event) => runtime.receive(event))
  window.addEventListener('resize', () => runtime.fit())

  return runtime
}
