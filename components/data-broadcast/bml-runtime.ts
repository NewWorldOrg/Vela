import type { BmlCatalog } from '@/lib/bml/catalog'
import {
  BML_LIMITS,
  convertBml,
  parseBml,
  type BmlPage,
  type XmlParser,
} from '@/lib/bml/document'
import {
  answerTo,
  firstFocus,
  keysOf,
  navigationOf,
  type BmlKey,
  type Navigation,
} from '@/lib/bml/keys'
import {
  playerMessageFrom,
  type FontBytes,
  type PlayerMessage,
  type Programme,
  type RuntimeError,
  type RuntimeMessage,
} from '@/lib/bml/messages'
import { withPalette, type Palette } from '@/lib/bml/palette'
import { addressOf, type BmlAddress } from '@/lib/bml/paths'
import type { BmlModule, BmlResource } from '@/lib/bml/resources'
import { PLANE_ID, PLAYER_ORIGIN_META } from '@/lib/bml/runtime-document'
import { onGrid, planeIn } from '@/lib/bml/style'
import {
  mountPage,
  type MountedPage,
} from '@/components/data-broadcast/bml-page'

const ACTIVE_MS = 150

const IMAGE_TYPE: Partial<Record<BmlResource['kind'], string>> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
}

export type RuntimeWindow = Window & typeof globalThis

export type Mount = (page: BmlPage, plane: HTMLElement) => MountedPage

interface Shown {
  page: BmlPage
  mounted: MountedPage
  navigation: Navigation
  focused: number | null
  urls: string[]
}

function moduleKey(tag: number, id: number): string {
  return `${tag}/${id}`
}

/** What a document does when it is decided on and has a handler to run. Scripts are not run yet, so it says the operation is not supported. */
export interface ScriptHost {
  run(handler: string, on: HTMLElement): void
}

/** The runtime inside the sandboxed frame: it keeps the modules the player hands it, draws the document it is asked to open, and answers keys. */
export class BmlRuntime {
  private readonly window: RuntimeWindow

  private readonly plane: HTMLElement

  private readonly playerOrigin: string

  private readonly parser: XmlParser

  private readonly modules = new Map<string, BmlModule>()

  private catalog: BmlCatalog | null = null

  private shown: Shown | null = null

  private pending: BmlAddress | null = null

  clock: number | null = null

  programme: Programme | null = null

  readonly scripts: ScriptHost = {
    run: () => this.say({ kind: 'unsupported', what: 'script' }),
  }

  private readonly mount: Mount

  constructor(
    window: RuntimeWindow,
    plane: HTMLElement,
    playerOrigin: string,
    mount: Mount = mountPage,
  ) {
    this.window = window
    this.plane = plane
    this.playerOrigin = playerOrigin
    this.parser = new window.DOMParser() as unknown as XmlParser
    this.mount = mount
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
      case 'open':
        this.open()
        return
      case 'close':
        this.close()
        return
    }
  }

  private catalogue(catalog: BmlCatalog): void {
    const listed = new Map<string, number>()

    catalog.carousels.forEach((carousel) =>
      carousel.modules.forEach((module) =>
        listed.set(moduleKey(carousel.tag, module.id), module.version),
      ),
    )
    this.modules.forEach((module, key) => {
      if (listed.get(key) !== module.version) {
        this.modules.delete(key)
      }
    })
    this.catalog = catalog
  }

  private keep(module: BmlModule): void {
    this.modules.set(moduleKey(module.tag, module.id), module)

    const pending = this.pending

    if (pending && pending.tag === module.tag && pending.module === module.id) {
      this.launch(pending, false)
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
  }

  private close(): void {
    this.waitFor(null)
    this.unmount()
  }

  private launch(address: BmlAddress, opening: boolean): void {
    const resource = this.lookup(address)

    if (!resource) {
      if (opening) {
        this.fail('missing')
      } else {
        this.waitFor(address)
      }

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

    const navigation = navigationOf(page.body)

    this.shown = {
      page,
      mounted: this.mount(page, this.plane),
      navigation,
      focused: null,
      urls,
    }
    this.fit()
    this.focus(firstFocus(navigation))
    this.say({
      kind: 'videoRect',
      rect: page.videoRect
        ? onGrid(page.videoRect, page.resolution, page.aspect)
        : null,
    })
    this.say({ kind: 'usedKeys', keys: keysOf(page.usedKeys) })
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

  private focus(index: number | null): void {
    const shown = this.shown

    if (!shown) {
      return
    }

    const from =
      shown.focused === null
        ? undefined
        : shown.mounted.byNavIndex.get(shown.focused)
    const to = index === null ? undefined : shown.mounted.byNavIndex.get(index)

    from?.removeAttribute('data-bml-focus')
    to?.setAttribute('data-bml-focus', '')
    shown.focused = index
  }

  private press(key: BmlKey): void {
    const shown = this.shown

    if (!shown) {
      return
    }

    const answer = answerTo(key, shown.navigation, shown.focused)

    if (answer.answer === 'moved') {
      this.focus(answer.to)
    } else if (answer.answer === 'decided') {
      this.decide(shown.mounted.byNavIndex.get(answer.on))
    }
  }

  private decide(element: HTMLElement | undefined): void {
    if (!element) {
      return
    }

    element.setAttribute('data-bml-active', '')
    this.window.setTimeout(
      () => element.removeAttribute('data-bml-active'),
      ACTIVE_MS,
    )

    const handler = element.getAttribute('data-bml-attr-onclick')
    const href = element.getAttribute('data-bml-href')
    const target = href ? addressOf(href) : null

    if (handler) {
      this.scripts.run(handler, element)
    } else if (target) {
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

  const runtime = new BmlRuntime(window, plane, origin)

  window.addEventListener('message', (event) => runtime.receive(event))
  window.addEventListener('resize', () => runtime.fit())

  return runtime
}
