import {
  browserOf,
  registersOf,
  type BrowserHost,
  type LockAnswer,
} from '@/lib/bml/browser'
import { appStartOf, sameStart, type AppStart } from '@/lib/bml/ait'
import { staysListed, takesThePlace, type BmlCatalog } from '@/lib/bml/catalog'
import { dateOnAir } from '@/lib/bml/clock'
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
import type { LineState, ReceiverId } from '@/lib/bml/line'
import { PersistentMemory } from '@/lib/bml/memory'
import {
  MOST_REGISTER,
  SHARED_REGISTERS,
  playerMessageFrom,
  sharedRegistersOf,
  type FontBytes,
  type PlayerMessage,
  type Programme,
  type RuntimeError,
  type RuntimeMessage,
} from '@/lib/bml/messages'
import {
  MNG_LIMITS,
  isMng,
  paintedWith,
  readMng,
  type MngAnimation,
} from '@/lib/bml/mng'
import { nptMilliseconds, type NptReading } from '@/lib/bml/npt'
import { withPalette, type Palette } from '@/lib/bml/palette'
import {
  addressOf,
  locationOf,
  moduleAddressOf,
  modulePathOf,
  pathOf,
  resolveReference,
  streamPathOf,
  streamTagOf,
  type BmlAddress,
} from '@/lib/bml/paths'
import { builtinsOf, Realm } from '@/lib/bml/realm'
import type { BmlModule, BmlResource } from '@/lib/bml/resources'
import { PLANE_ID, PLAYER_ORIGIN_META } from '@/lib/bml/runtime-document'
import {
  MOST_RUN_MS,
  ScriptScope,
  scopeOf,
  type DocumentGlobals,
  type Evaluate,
} from '@/lib/bml/scripts'
import {
  FONT_METRICS,
  onGrid,
  planeIn,
  type UsedKeyGroup,
} from '@/lib/bml/style'
import { tableClassesOf } from '@/lib/bml/tables'
import { frameEvaluator } from '@/components/data-broadcast/bml-evaluator'
import {
  LineRequests,
  type Awaited,
  type LineAnswer,
} from '@/components/data-broadcast/bml-line'
import {
  MngPlayer,
  pixelsHeld,
  type MngBitmap,
  type MngCanvas,
} from '@/components/data-broadcast/bml-mng'
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

/** How often the data button is pressed again on an entry document that still cannot be seen: one that readies itself on timers after its scripts, as a viewer presses it a moment after tuning in. */
const DATA_BUTTON_EVERY_MS = 500

const MOST_DATA_BUTTON_PRESSES = 20

/** How many pixels of MNG a page may hold at once, each canvas and its pictures decoded. */
const MOST_ANIMATED_PIXELS = 2 * MNG_LIMITS.pixels

const LOCKED = 0

const NOT_FOUND = -2

const IMAGE_TYPE: Partial<Record<BmlResource['kind'], string>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
}

export type RuntimeWindow = Window & typeof globalThis

export type Mount = (page: BmlPage, plane: HTMLElement) => MountedPage

export type Decode = (png: Uint8Array) => Promise<MngBitmap>

export interface RuntimeOptions {
  mount?: Mount
  evaluate?: Evaluate
  now?: () => number
  realm?: Realm
  decode?: Decode
}

interface Shown {
  page: BmlPage
  mounted: MountedPage
  document: BmlDocument
  scope: ScriptScope
  navigation: Navigation
  focused: HTMLElement | null
  urls: string[]
  players: Map<HTMLElement, MngPlayer<MngBitmap>>
  usedKeys: UsedKeyGroup[]
  nptTold: Set<EventItem>
}

interface HeldNpt {
  reading: NptReading
  takenAt: number
}

interface Timer {
  handle: number
  left: number | null
}

type Leaving =
  { to: BmlAddress } | { reload: true } | { quit: true } | { start: AppStart }

/** Where a run that waits on the line was: the page and the event it ran for. */
interface Seen {
  shown: Shown
  event: BmlEvent | null
  bindings: DocumentGlobals | null
}

function moduleKey(tag: number, id: number): string {
  return `${tag}/${id}`
}

function moduleOfKey(key: string): [number, number] {
  const [tag, id] = key.split('/')

  return [Number(tag), Number(id)]
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

  private readonly npt = new Map<number, HeldNpt>()

  private readonly registers = { Ureg: registersOf(), Greg: registersOf() }

  private readonly memory: PersistentMemory

  private readonly mount: Mount

  private readonly evaluate: Evaluate

  private readonly now: () => number

  private readonly wallClock = Date.now.bind(Date)

  private readonly date = dateOnAir(Date, () => this.timeOnAir())

  private readonly realm: Realm

  private readonly decode: Decode

  private catalog: BmlCatalog | null = null

  private shown: Shown | null = null

  private pending: BmlAddress | null = null

  private leaving: Leaving | null = null

  private depth = 0

  private settling = false

  private timerIds = 0

  private presses = 0

  private pressing: number | null = null

  private line: LineState = 'none'

  private receiverId: ReceiverId | null = null

  private hybridcast = false

  private failedStarts: AppStart[] = []

  private readonly requests: LineRequests<Seen>

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
    this.realm = options.realm ?? new Realm([])
    this.decode =
      options.decode ??
      ((png) =>
        window.createImageBitmap(
          new Blob([png.slice()], { type: 'image/png' }),
        ))
    this.memory = new PersistentMemory((name, value) =>
      this.say({ kind: 'memory', name, value }),
    )
    this.requests = new LineRequests((ask) => this.say(ask))
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
      case 'npt':
        this.npt.set(message.reading.tag, {
          reading: message.reading,
          takenAt: this.now(),
        })
        this.nptReferred()
        return
      case 'line':
        this.line = message.line
        this.receiverId = message.receiverId
        return
      case 'transmitted':
        this.answered(
          this.requests.answered(message.id, {
            to: 'transmit',
            answer: message.answer,
          }),
        )
        return
      case 'aitRead':
        this.answered(this.requests.aitRead(message.id, message.applications))
        return
      case 'hybridcast':
        this.hybridcast = message.allowed
        this.failedStarts = message.failed
        return
      case 'greg':
        this.registers.Greg.splice(0, message.greg.length, ...message.greg)
        return
      case 'fetched':
        this.took(message.id, message.module)
        return
      case 'open':
        this.open(message.startup)
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
    this.leaveWhatIsGone(gone)
  }

  /** A page whose module the catalog no longer lists gives way to the start document, unless its own handler for the module going already moved elsewhere. */
  private leaveWhatIsGone(gone: BmlModule[]): void {
    const shown = this.shown
    const startup = this.catalog ? addressOf(this.catalog.startup) : null
    const address = shown?.page.address

    if (
      !shown ||
      !address ||
      !startup ||
      !gone.some(
        (module) => module.tag === address.tag && module.id === address.module,
      )
    ) {
      return
    }

    this.launch(startup, false)
    this.presses = 0
    this.nudge()
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
      this.presses = 0
      this.nudge()

      return
    }

    if (held && held.version !== module.version) {
      this.moduleChanged(module, 0)
    }

    if (this.locked.has(key)) {
      this.moduleLocked(module, LOCKED)
    }
  }

  private load(font: FontBytes): void {
    const face = new FontFace(
      font.family,
      font.bytes,
      FONT_METRICS[font.family],
    )

    face
      .load()
      .then((loaded) => this.window.document.fonts.add(loaded))
      .catch(() => this.warn('font did not load'))
  }

  lookup(address: BmlAddress): BmlResource | undefined {
    if (address.url !== undefined) {
      return this.requests.resource(address.url)
    }

    return this.modules
      .get(moduleKey(address.tag, address.module))
      ?.resources.find((resource) => resource.path === address.name)
  }

  /** Opens at the catalog's start document, or at the one the player names: the start document of the component a Hybridcast application went back to. */
  private open(named?: string): void {
    const startup = this.catalog
      ? addressOf(named ?? this.catalog.startup)
      : null

    if (!startup) {
      this.fail('missing')

      return
    }

    this.launch(startup, true)
    this.presses = 0
    this.nudge()
  }

  private close(): void {
    this.waitFor(null)
    this.unmount()
    this.requests.clear()
  }

  /** Presses the data button on a document that cannot be seen, so that an entry document moves on to its face, and again every moment while it still cannot be seen, for some seconds: an entry document that takes a while to get ready, locking modules first, takes the press once it is. */
  private nudge(): void {
    const shown = this.shown

    this.stopNudging()

    if (
      !shown ||
      !shown.document.cannotBeSeen() ||
      this.presses >= MOST_DATA_BUTTON_PRESSES
    ) {
      return
    }

    this.presses += 1
    this.dataButtonPressed()

    if (this.shown === shown && shown.document.cannotBeSeen()) {
      this.pressing = this.window.setTimeout(
        () => this.nudge(),
        DATA_BUTTON_EVERY_MS,
      )
    }
  }

  private stopNudging(): void {
    if (this.pressing !== null) {
      this.window.clearTimeout(this.pressing)
      this.pressing = null
    }
  }

  private launch(address: BmlAddress, opening: boolean): void {
    if (address.url !== undefined) {
      this.launchOverTheLine(address, address.url)

      return
    }

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

  /** A document over the line is fetched through the player, and waited for like a module of the carousel. One that could not be fetched, or is not a document, leaves the page as it is. */
  private launchOverTheLine(address: BmlAddress, url: string): void {
    if (this.line !== 'on') {
      this.refuseTheLine('launchDocument')

      return
    }

    if (!this.requests.has(url)) {
      this.requests.fetch([url])
      this.waitFor(address)

      return
    }

    const resource = this.requests.resource(url)

    if (resource?.kind !== 'bml') {
      this.waitFor(null)
      this.warn(`not a document over the line: ${url}`)

      return
    }

    this.show(address, resource)
  }

  /** A function that uses the line, called while it is not used: the player is told the setting refuses it, or, where there is no line, that the operation is not supported. */
  private refuseTheLine(what: string): void {
    if (this.line === 'off') {
      this.say({ kind: 'line', said: 'off' })

      return
    }

    this.say({ kind: 'unsupported', what })
  }

  private show(address: BmlAddress, resource: BmlResource): void {
    const urls: string[] = []
    const missing = new Set<string>()

    try {
      const page = this.read(address, resource, urls, missing)

      if (!page) {
        this.discard(urls)
        this.fail('malformed')

        return
      }

      this.missingScripts(page, missing)

      if (missing.size > 0) {
        this.discard(urls)
        this.requests.fetch(missing)
        this.waitFor(this.requests.waiting ? address : null)

        if (!this.requests.waiting) {
          this.show(address, resource)
        }

        return
      }

      this.waitFor(null)
      this.draw(page, urls)
    } catch {
      this.discard(urls)
      this.fail('malformed')
    }
  }

  /** The scripts of a page over the line that are not fetched yet. */
  private missingScripts(page: BmlPage, missing: Set<string>): void {
    page.scripts.forEach((script) => {
      const url = 'src' in script ? locationOf(script.src)?.url : undefined

      if (url !== undefined && !this.requests.has(url)) {
        missing.add(url)
      }
    })
  }

  private read(
    address: BmlAddress,
    resource: BmlResource,
    urls: string[],
    missing: Set<string>,
  ): BmlPage | null {
    if (resource.body.length > BML_LIMITS.documentBytes) {
      return null
    }

    const root = parseBml(new TextDecoder().decode(resource.body), this.parser)
    const reading = root
      ? convertBml(root, {
          address,
          lookup: (wanted) => {
            if (wanted.url !== undefined && !this.requests.has(wanted.url)) {
              missing.add(wanted.url)
            }

            return this.lookup(wanted)
          },
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
        this.realm,
      ),
      navigation: navigationOf(page.body),
      focused: null,
      urls,
      players: new Map(),
      usedKeys: page.usedKeys,
      nptTold: new Set(),
    }

    this.shown = shown
    this.fit()
    mounted.nodes.forEach((node, element) => {
      if (node.mng) {
        this.animate(shown, element, node.mng)
      }
    })
    this.start(shown)
  }

  /** Runs the document's scripts and its body's `onload`, then settles its focus where they did not, and tells the player of it, unless a script moved on. */
  private start(shown: Shown, from = 0): void {
    const scripts = shown.page.scripts

    for (let at = from; at < scripts.length; at += 1) {
      const script = scripts[at]
      const code =
        'source' in script ? script.source : this.scriptAt(script.src)

      if (code === null) {
        this.warn('missing script')
      } else if (
        !this.execute(code, null, () => this.start(shown, at + 1)) ||
        this.shown !== shown
      ) {
        return
      }
    }

    this.loaded(shown)
  }

  private loaded(shown: Shown): void {
    const onload = handlerOf(shown.mounted.body, 'onload')

    if (
      onload &&
      (!this.execute(onload, { type: 'load', target: null }, () =>
        this.settleFocus(shown),
      ) ||
        this.shown !== shown)
    ) {
      return
    }

    this.settleFocus(shown)
  }

  private settleFocus(shown: Shown): void {
    if (shown.focused === null) {
      this.focus(this.elementAt(shown, firstFocus(shown.navigation)), false)
    }
    this.tellVideoRect(shown)
    this.say({ kind: 'usedKeys', keys: keysOf(shown.usedKeys) })
    this.window.setTimeout(() => {
      if (this.shown === shown) {
        this.nptReferred()
      }
    }, 0)
  }

  /** Where the video goes on the page's grid; whole while the page cannot be seen, as the receiver shows the video alone until an entry document shows itself. */
  private tellVideoRect(shown: Shown): void {
    const rect = shown.page.videoRect

    this.say({
      kind: 'videoRect',
      rect:
        rect && !shown.document.cannotBeSeen()
          ? onGrid(rect, shown.page.resolution, shown.page.aspect)
          : null,
    })
  }

  private scriptAt(path: string): string | null {
    const address = locationOf(path)
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
      Date: this.date,
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
      seenChanged: () => {
        if (this.shown) {
          this.tellVideoRect(this.shown)
        }
      },
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
      animate: (element, reference) => this.animateFrom(element, reference),
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
      npt: () => this.nptNow(),
      programme: () => this.programme,
      hasComponent: (tag) =>
        this.catalog?.carousels.some((carousel) => carousel.tag === tag) ??
        false,
      listed: (reference) => this.listed(reference),
      quit: () => {
        this.leaving = { quit: true }
      },
      memory: this.memory,
      registers: this.registers,
      startTimer: (code, everyMs, times) =>
        this.startTimer(code, everyMs, times),
      stopTimer: (id) => this.stopTimer(id),
      sleep: (ms) => this.sleep(ms),
      lock: (reference) => this.lock(reference),
      unlock: (reference) => this.unlock(reference),
      lockedModules: () =>
        [...this.locked].map((key) => ({
          path: modulePathOf(...moduleOfKey(key)),
          held: this.modules.has(key),
        })),
      unsupported: (what) => this.say({ kind: 'unsupported', what }),
      warn: (what) => this.warn(what),
      line: () => this.line,
      receiverId: () => this.receiverId,
      overTheLine: () => this.shown?.page.address.url !== undefined,
      transmit: (uri, text, charset) =>
        this.requests.transmit(uri, text, charset),
      lineOff: (what) => {
        this.warn(`the line is off: ${what}`)
        this.say({ kind: 'line', said: 'off' })
      },
      hybridcast: () => this.hybridcast && this.line === 'on',
      receiveAit: (uri) => this.requests.receiveAit(uri),
      receivedAit: (uri) => this.requests.receivedAit(uri),
      readAit: (uri) => this.requests.readAit(uri),
      startApplication: (start) => {
        this.leaving = { start }
      },
      unopened: () => this.say({ kind: 'unopened' }),
      failedBefore: (start) =>
        this.failedStarts.some((failed) => sameStart(failed, start)),
      playRomSound: (sound) => this.say({ kind: 'romsound', sound }),
    }
  }

  /** The time the documents see, in milliseconds: live, the wall clock as the runtime found it, not as a document may have rewritten it; in a recording, the time on air the player told last. The player tells it at each tick while playback moves and not while it stands, so it is held between ticks rather than run on: it stops with a pause, never runs ahead of the picture, and goes back only with a seek. */
  private timeOnAir(): number {
    return this.clock === null
      ? this.wallClock()
      : Math.round(this.clock * 1000)
  }

  private relativeTime(): number | null {
    const startsAt = this.programme?.startsAt

    if (typeof startsAt !== 'number') {
      return null
    }

    return Math.max(0, Math.floor(this.timeOnAir() / 1000 - startsAt))
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

    if (address.url !== undefined && this.line !== 'on') {
      this.refuseTheLine('launchDocument')

      return false
    }

    this.leaving = { to: address }

    return true
  }

  /** Runs one piece of the document's code, telling the player when it starts and ends so that one that runs too long is seen. True when the document is still the one shown and has not asked to move on, to a document there already or to one still awaited, and the code is not waiting on the line. One that waits is run again with `answers` once the answer is in, and `then` after it. */
  private execute(
    code: string,
    event: BmlEvent | null,
    then: (() => void) | null = null,
    answers: LineAnswer[] = [],
  ): boolean {
    const shown = this.shown

    if (!shown) {
      return false
    }

    this.say({ kind: 'script', state: 'running' })
    this.depth += 1

    const bindings = this.mayWait() ? shown.scope.bindings() : null
    const call = this.requests.begin(answers)
    const outcome =
      event === null
        ? shown.scope.run(code)
        : shown.document.during(event, () => shown.scope.run(code))

    this.requests
      .end(call, { shown, event, bindings }, code, then)
      .forEach((timer) => this.stopTimer(timer))
    this.depth -= 1
    this.say({
      kind: 'script',
      state: outcome.tookMs > MOST_RUN_MS ? 'overran' : 'done',
    })

    if (outcome.outcome === 'failed') {
      this.warn(`script failed: ${describe(outcome.error)}`)
    }

    if (this.depth === 0) {
      this.settle()
    }

    return (
      this.shown === shown &&
      this.leaving === null &&
      this.pending === null &&
      call.asked === null
    )
  }

  /** Whether a run may stop to wait on the line: while the line is used, or Hybridcast is allowed and its AIT is read through the player. */
  private mayWait(): boolean {
    return this.line === 'on' || this.hybridcast
  }

  /** Runs again the code that waited on the line, now that its answer is in, if its page is still the one shown, and what was to follow it. The document's globals are put back as they were when the run began first, so that what it set before it stopped, a guard against a second press say, does not turn its run again away. */
  private answered(awaited: Awaited<Seen> | null): void {
    const shown = awaited?.seen.shown

    if (!awaited || !shown || shown !== this.shown) {
      return
    }

    shown.scope.putBack(awaited.seen.bindings)

    if (
      this.execute(
        awaited.code,
        awaited.seen.event,
        awaited.then,
        awaited.answers,
      ) &&
      this.shown === shown
    ) {
      awaited.then?.()
    }
  }

  /** Keeps what a fetch brought, and opens the document that waited on it once nothing else is on its way. */
  private took(id: number, module: BmlModule | null): void {
    const pending = this.pending

    if (!this.requests.took(id, module) || pending?.url === undefined) {
      return
    }

    this.launch(pending, false)
    this.presses = 0
    this.nudge()
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

      if ('quit' in leaving) {
        this.quit()
      } else if ('start' in leaving) {
        this.startApplication(leaving.start)
      } else if ('reload' in leaving) {
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

  /** Ends the broadcast's documents as one of them asked: the plane is cleared and the player is told to close. */
  private quit(): void {
    this.close()
    this.say({ kind: 'exit' })
  }

  /** Ends the broadcast's documents to start the application a document asked for, handing the player the shared registers so that the application, and the documents when they come back, read what was written. Each register goes as a string no longer than the most one carries, whatever a document left in it. A start the player would not take leaves the documents as they are, and is said not to open. */
  private startApplication(start: AppStart): void {
    const greg = Array.from({ length: SHARED_REGISTERS }, (_, at) =>
      registerText(this.registers.Greg[at]),
    )
    const asked = appStartOf(start)

    if (!asked || !sharedRegistersOf(greg)) {
      this.say({ kind: 'unopened' })

      return
    }

    this.close()
    this.say({ kind: 'startApp', start: asked, greg })
  }

  /** Whether the module a reference names is in the catalog now; null when the reference names no module. */
  private listed(reference: unknown): boolean | null {
    const base = this.shown?.page.address
    const address =
      typeof reference === 'string' && base
        ? moduleAddressOf(reference, base)
        : null

    if (!address) {
      return null
    }

    return (
      this.catalog?.carousels.some(
        (carousel) =>
          carousel.tag === address.tag &&
          carousel.modules.some((module) => module.id === address.module),
      ) ?? false
    )
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

  /** One press of the data button: the items listening for it hear it, and a document with no such item gets the key. */
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

  /** Tells the document a module it asked to lock is held, or is not in the carousel at all. */
  private moduleLocked(
    module: { tag: number; id: number },
    status: number,
  ): void {
    const base = this.shown?.page.address

    if (base) {
      this.occur(
        'ModuleLocked',
        { status, moduleRef: modulePathOf(module.tag, module.id) },
        (item) => namesModule(item, base, module),
      )
    }
  }

  /** The NPT of the stream carrying the document shown, or of the first stream that has one, in whole milliseconds now. */
  private nptNow(): number | null {
    const tag = this.shown?.page.address.tag
    const held =
      (tag === undefined ? undefined : this.npt.get(tag)) ??
      [...this.npt.entries()].sort(([one], [other]) => one - other)[0]?.[1]

    return held
      ? nptMilliseconds(held.reading, this.now() - held.takenAt)
      : null
  }

  /** The stream an `NPTReferred` item names, or the one carrying the document when it names none. */
  private nptStreamOf(item: EventItem, shown: Shown): number | null {
    const reference = item.attributes.get('es_ref')

    return reference === undefined
      ? shown.page.address.tag
      : streamTagOf(reference)
  }

  /** Tells each `NPTReferred` item of the document shown, once, that the NPT of the stream it names can be read. */
  private nptReferred(): void {
    const shown = this.shown

    if (!shown) {
      return
    }

    const due = new Map<EventItem, number>()

    listening(shown.document.items, 'NPTReferred').forEach((item) => {
      const stream = this.nptStreamOf(item, shown)

      if (!shown.nptTold.has(item) && stream !== null && this.npt.has(stream)) {
        due.set(item, stream)
      }
    })
    due.forEach((_, item) => shown.nptTold.add(item))

    for (const stream of new Set(due.values())) {
      this.occur(
        'NPTReferred',
        { status: 0, esRef: streamPathOf(stream) },
        (item) => due.get(item) === stream,
      )

      if (this.shown !== shown) {
        return
      }
    }
  }

  private fired(event: BroadcastEvent): void {
    const streams =
      this.catalog?.carousels.map((carousel) => carousel.tag) ?? []

    this.occur(
      'EventMessageFired',
      {
        messageGroupId: event.group,
        messageId: event.id,
        messageVersion: event.type,
        privateData: privateDataOf(event.privateData),
      },
      (item) => listensFor(item, event, streams),
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

    const carousel = this.catalog?.carousels.find(
      (listed) => listed.tag === address.tag,
    )

    if (!carousel) {
      return 'noComponent'
    }

    const key = moduleKey(address.tag, address.module)
    const held = this.modules.get(key)
    const listed = carousel.modules.some(
      (module) => module.id === address.module,
    )

    if (!held && !listed) {
      this.window.setTimeout(() => {
        this.moduleLocked({ tag: address.tag, id: address.module }, NOT_FOUND)
      }, 0)

      return 'absent'
    }

    this.locked.add(key)

    if (!held) {
      return 'waiting'
    }

    this.window.setTimeout(() => {
      if (this.locked.has(key)) {
        this.moduleLocked(held, LOCKED)
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
    this.requests.started(id)

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

  /** Plays the MNG a script gave a canvas, read as the document's own are; what is not one, or is malformed, is a warning and the canvas plays on what it played. */
  private animateFrom(element: HTMLElement, reference: string): void {
    const shown = this.shown
    const resource = this.resourceOf(reference)

    if (!shown || !resource) {
      this.warn(`missing image: ${reference}`)

      return
    }

    if (!isMng(resource.body)) {
      this.warn(`unsupported image: ${reference}`)

      return
    }

    const reading = readMng(resource.body)

    if (reading.read === 'malformed') {
      this.warn(`malformed MNG: ${reference} (${reading.why})`)

      return
    }

    reading.ignored.forEach((type) =>
      this.warn(`unsupported MNG chunk: ${type}`),
    )
    this.animate(shown, element, paintedWith(reading.mng, shown.page.palette))
  }

  /** Plays an MNG on a canvas of the page, stopping what played there, unless the page would then hold more decoded pixels than it may. */
  private animate(shown: Shown, element: HTMLElement, mng: MngAnimation): void {
    shown.players.get(element)?.stop()
    shown.players.delete(element)

    const held = [...shown.players.values()]
      .filter((player) => player.playing)
      .reduce((sum, player) => sum + player.pixels, 0)

    if (held + pixelsHeld(mng) > MOST_ANIMATED_PIXELS) {
      this.warn('too many MNG pixels on the page')

      return
    }

    const player = new MngPlayer(
      element as unknown as MngCanvas<MngBitmap>,
      mng,
      {
        decode: this.decode,
        setTimeout: (run, ms) => this.window.setTimeout(run, ms),
        clearTimeout: (id) => this.window.clearTimeout(id),
        warn: (message) => this.warn(message),
        now: () => this.now(),
      },
    )

    shown.players.set(element, player)
    player.play()
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
    this.requests.drop()
    this.stopTimers()
    this.stopNudging()
    this.locked.clear()
    this.shown?.players.forEach((player) => player.stop())
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

  /** A script may focus any element of the page, with a `nav-index` or without: one without takes the keys but the arrows lead nowhere from it. */
  private focusOn(element: HTMLElement | null): void {
    const shown = this.shown

    if (!shown || (element !== null && !shown.mounted.nodes.has(element))) {
      return
    }

    this.focus(element, true)
  }

  private elementAt(shown: Shown, index: number | null): HTMLElement | null {
    return index === null ? null : (shown.mounted.byNavIndex.get(index) ?? null)
  }

  /** The `nav-index` the focus is at, or null when nothing is focused or the focused element has none the arrows go by. */
  private navIndexOf(shown: Shown): number | null {
    const focused = shown.focused
    const index = focused ? shown.mounted.nodes.get(focused)?.nav.index : null

    return index !== undefined &&
      index !== null &&
      shown.mounted.byNavIndex.get(index) === focused
      ? index
      : null
  }

  /** Moves the focus, running `onblur` on the element it leaves and `onfocus` on the one it reaches when asked to. */
  private focus(to: HTMLElement | null, telling: boolean): void {
    const shown = this.shown

    if (!shown) {
      return
    }

    const from = shown.focused
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
    shown.focused = to
    shown.document.focusedIs(to)

    const onfocus = to && telling ? handlerOf(to, 'onfocus') : null

    if (onfocus) {
      this.execute(onfocus, {
        type: 'focus',
        target: shown.document.elementTarget(to),
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

    const focused = shown.focused
    const answer = answerTo(key, shown.navigation, this.navIndexOf(shown))
    const decides =
      answer.answer === 'decided' ||
      (answer.answer === 'pressed' && key === 'enter' && focused !== null)

    if (answer.answer === 'moved') {
      this.focus(this.elementAt(shown, answer.to), true)
    } else if (decides) {
      this.decide(focused ?? undefined)
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
    const focused = shown.focused
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
    for (const element of shown.mounted.byNavIndex.values()) {
      if (handlerOf(element, 'accesskey') === key) {
        this.focus(element, true)

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
    const target = href ? locationOf(href) : null
    const follow = target ? () => this.launch(target, false) : null

    if (
      handler &&
      (!this.execute(
        handler,
        {
          type: 'click',
          target: shown.document.elementTarget(element),
        },
        follow,
      ) ||
        this.shown !== shown)
    ) {
      return
    }

    follow?.()
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

const MOST_REASON = 200

/** What a shared register holds, as the player is handed it: a string, cut at the most a register carries. Anything a document left that is not a string, a number or a truth value is empty. */
function registerText(value: unknown): string {
  const text =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
      ? String(value)
      : ''

  return text.slice(0, MOST_REGISTER)
}

/** An error as the console is told of it: its name and the start of its message. */
function describe(error: unknown): string {
  const thrown = error as { name?: unknown; message?: unknown } | null
  const name =
    typeof thrown?.name === 'string' && thrown.name.length > 0
      ? thrown.name
      : 'Error'
  const reason =
    typeof thrown?.message === 'string'
      ? thrown.message.replace(/\s+/g, ' ').slice(0, MOST_REASON)
      : ''

  return reason.length > 0 ? `${name}: ${reason}` : name
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
    realm: new Realm(builtinsOf(window)),
  })

  window.addEventListener('message', (event) => runtime.receive(event))
  window.addEventListener('resize', () => runtime.fit())

  return runtime
}
