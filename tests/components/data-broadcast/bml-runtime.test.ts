import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { DOMParser } from '@xmldom/xmldom'

import {
  BmlRuntime,
  type Mount,
  type RuntimeWindow,
} from '@/components/data-broadcast/bml-runtime'
import type { BmlCatalog } from '@/lib/bml/catalog'
import type { PageNode } from '@/lib/bml/document'
import type { PlayerMessage, RuntimeMessage } from '@/lib/bml/messages'
import type { BmlModule, ResourceKind } from '@/lib/bml/resources'

const VELA = 'https://vela.example'

class QuietParser extends DOMParser {
  constructor() {
    super({ onError: () => {} })
  }
}

class FakeElement {
  readonly attributes = new Map<string, string>()

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value)
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name)
  }
}

function fakeMount(): { mount: Mount; byIndex: Map<number, FakeElement> } {
  const byIndex = new Map<number, FakeElement>()
  const walk = (node: PageNode) => {
    if (node.kind !== 'element') {
      return
    }

    if (node.nav.index !== undefined) {
      const element = new FakeElement()

      node.attributes.forEach(([name, value]) =>
        element.setAttribute(name, value),
      )
      byIndex.set(node.nav.index, element)
    }

    node.children.forEach(walk)
  }

  return {
    byIndex,
    mount: (page) => {
      byIndex.clear()
      walk(page.body)

      return {
        body: new FakeElement() as unknown as HTMLElement,
        byNavIndex: byIndex as unknown as Map<number, HTMLElement>,
      }
    },
  }
}

function frame(mount: Mount = fakeMount().mount) {
  const said: RuntimeMessage[] = []
  const parent = {
    postMessage: (message: RuntimeMessage, origin: string) => {
      assert.equal(origin, VELA)
      said.push(message)
    },
  }
  const window = {
    parent,
    DOMParser: QuietParser,
    innerWidth: 960,
    innerHeight: 540,
    console: { warn: () => {} },
    setTimeout: () => 0,
    document: { fonts: { add: () => {} } },
  } as unknown as RuntimeWindow
  const plane = {
    style: {},
    replaceChildren: () => {},
  } as unknown as HTMLElement
  const runtime = new BmlRuntime(window, plane, VELA, mount)
  const send = (data: PlayerMessage, origin = VELA, source: unknown = parent) =>
    runtime.receive({ origin, source, data } as MessageEvent)

  return { said, send }
}

const text = (value: string) => new TextEncoder().encode(value)

function bml(body: string): string {
  return `<?xml version="1.0"?><bml><head/><body>${body}</body></bml>`
}

function module(
  id: number,
  resources: Record<string, [ResourceKind, string]>,
): BmlModule {
  return {
    tag: 0x40,
    id,
    version: 1,
    resources: Object.entries(resources).map(([path, [kind, body]]) => ({
      path,
      kind,
      body: text(body),
    })),
  }
}

const CATALOG: BmlCatalog = {
  service: 1,
  entryTag: 0x40,
  autoStart: false,
  startup: '/40/0000/startup.bml',
  carousels: [
    {
      tag: 0x40,
      downloadId: 1,
      modules: [0, 1].map((id) => ({ id, version: 1, size: 0, resources: [] })),
    },
  ],
}

const STARTUP = bml(
  '<object type="video/X-arib-mpeg2" style="left: 480px; top: 0px; width: 480px; height: 270px"/>' +
    '<a href="~/0001/next.bml" style="nav-index: 0; nav-down: 1">next</a>' +
    '<a href="gone.bml" style="nav-index: 1; nav-up: 0; nav-down: 2">gone</a>' +
    '<p onclick="go()" style="nav-index: 2; nav-up: 1">script</p>',
)

const NEXT = bml(
  '<object type="video/X-arib-mpeg2" style="left: 0px; top: 0px; width: 320px; height: 180px"/>',
)

function opened(mount?: Mount) {
  const opening = frame(mount)

  opening.send({ kind: 'catalog', catalog: CATALOG })
  opening.send({
    kind: 'module',
    module: module(0, { 'startup.bml': ['bml', STARTUP] }),
  })
  opening.send({ kind: 'open' })

  return opening
}

test('opening draws the start document and tells the player where the video goes and which keys it takes', () => {
  const { mount, byIndex } = fakeMount()
  const { said } = opened(mount)

  assert.deepEqual(said, [
    {
      kind: 'videoRect',
      rect: { left: 480, top: 0, width: 480, height: 270 },
    },
    {
      kind: 'usedKeys',
      keys: [
        'up',
        'down',
        'left',
        'right',
        'enter',
        'back',
        'd',
        'blue',
        'red',
        'green',
        'yellow',
      ],
    },
  ])
  assert.equal(byIndex.get(0)?.getAttribute('data-bml-focus'), '')
})

test('opening with no catalog, or no start document, says it is missing', () => {
  const bare = frame()

  bare.send({ kind: 'open' })

  const empty = frame()

  empty.send({ kind: 'catalog', catalog: CATALOG })
  empty.send({ kind: 'module', module: module(0, {}) })
  empty.send({ kind: 'open' })

  assert.deepEqual(bare.said, [{ kind: 'error', reason: 'missing' }])
  assert.deepEqual(empty.said, [{ kind: 'error', reason: 'missing' }])
})

test('a link into a module that has not arrived waits for it, then opens', () => {
  const { said, send } = opened()

  said.length = 0
  send({ kind: 'key', key: 'enter' })

  assert.deepEqual(said, [{ kind: 'waiting', waiting: true }])

  send({ kind: 'module', module: module(1, { 'next.bml': ['bml', NEXT] }) })

  assert.deepEqual(said.slice(1, 3), [
    { kind: 'waiting', waiting: false },
    { kind: 'videoRect', rect: { left: 0, top: 0, width: 320, height: 180 } },
  ])
})

test('a link to a resource its arrived module does not hold is missing, not waited for', () => {
  const { said, send } = opened()

  said.length = 0
  send({ kind: 'key', key: 'down' })
  send({ kind: 'key', key: 'enter' })

  assert.deepEqual(said, [{ kind: 'error', reason: 'missing' }])
})

test('a module that arrives without the resource waited for ends the wait as missing', () => {
  const { said, send } = opened()

  said.length = 0
  send({ kind: 'key', key: 'enter' })
  send({ kind: 'module', module: module(1, { 'other.bml': ['bml', NEXT] }) })

  assert.deepEqual(said, [
    { kind: 'waiting', waiting: true },
    { kind: 'waiting', waiting: false },
    { kind: 'error', reason: 'missing' },
  ])
})

test('deciding on an element with a handler says scripts are not supported yet', () => {
  const { said, send } = opened()

  said.length = 0
  send({ kind: 'key', key: 'down' })
  send({ kind: 'key', key: 'down' })
  send({ kind: 'key', key: 'enter' })

  assert.deepEqual(said, [{ kind: 'unsupported', what: 'script' }])
})

test('a start document that is not well formed, not BML text or not decoded is an error', () => {
  const cases: [ResourceKind, string, string][] = [
    ['bml', '<bml><body><p></bml>', 'malformed'],
    ['css', 'p {}', 'malformed'],
    ['undecoded', STARTUP, 'undecoded'],
  ]

  for (const [kind, body, reason] of cases) {
    const { said, send } = frame()

    send({ kind: 'catalog', catalog: CATALOG })
    send({ kind: 'module', module: module(0, { 'startup.bml': [kind, body] }) })
    send({ kind: 'open' })

    assert.deepEqual(said, [{ kind: 'error', reason }], kind)
  }
})

test('a page that fails to draw is an error, and every image made for it is let go', () => {
  const made: string[] = []
  const released: string[] = []

  mock.method(URL, 'createObjectURL', () => {
    made.push(`blob:test/${made.length}`)

    return made[made.length - 1]
  })
  mock.method(URL, 'revokeObjectURL', (url: string) => released.push(url))

  try {
    const { said, send } = frame(() => {
      throw new Error('cannot draw')
    })
    const jpeg = '\xff\xd8'

    send({ kind: 'catalog', catalog: CATALOG })
    send({
      kind: 'module',
      module: module(0, {
        'startup.bml': ['bml', bml('<img src="a.jpg"/><img src="a.jpg"/>')],
        'a.jpg': ['jpeg', jpeg],
      }),
    })
    send({ kind: 'open' })

    assert.deepEqual(said, [{ kind: 'error', reason: 'malformed' }])
    assert.equal(made.length, 2)
    assert.deepEqual([...released].sort(), [...made].sort())
  } finally {
    mock.restoreAll()
  }
})

test('what does not come from the player’s window in Vela’s origin is not heard', () => {
  const { said, send } = frame()

  send({ kind: 'catalog', catalog: CATALOG }, 'https://elsewhere.example')
  send({ kind: 'catalog', catalog: CATALOG }, VELA, {})
  send({ kind: 'open' })

  assert.deepEqual(said, [{ kind: 'error', reason: 'missing' }])
})

function versioned(id: number, version: number, body: string): BmlModule {
  return { ...module(id, { 'startup.bml': ['bml', body] }), version }
}

function listing(version: number): BmlCatalog {
  return {
    ...CATALOG,
    carousels: [
      {
        ...CATALOG.carousels[0],
        modules: [{ id: 0, version, size: 0, resources: [] }],
      },
    ],
  }
}

test('the start document held stays while the catalog lists a newer version that has not come, and gives way when it comes', () => {
  const first = bml(
    '<object type="video/X-arib-mpeg2" style="left: 0px; top: 0px; width: 480px; height: 270px"/>',
  )
  const second = bml(
    '<object type="video/X-arib-mpeg2" style="left: 480px; top: 270px; width: 480px; height: 270px"/>',
  )
  const { said, send } = frame()

  send({ kind: 'catalog', catalog: listing(1) })
  send({ kind: 'module', module: versioned(0, 1, first) })
  send({ kind: 'catalog', catalog: listing(2) })
  send({ kind: 'open' })

  assert.deepEqual(said[0], {
    kind: 'videoRect',
    rect: { left: 0, top: 0, width: 480, height: 270 },
  })

  send({ kind: 'module', module: versioned(0, 2, second) })
  send({ kind: 'module', module: versioned(0, 1, first) })
  send({ kind: 'open' })

  assert.deepEqual(said.at(-2), {
    kind: 'videoRect',
    rect: { left: 480, top: 270, width: 480, height: 270 },
  })
})

test('a module the catalog stops listing is let go', () => {
  const { said, send } = frame()

  send({ kind: 'catalog', catalog: CATALOG })
  send({ kind: 'module', module: module(0, { 'startup.bml': ['bml', NEXT] }) })
  send({ kind: 'catalog', catalog: { ...CATALOG, carousels: [] } })
  send({ kind: 'open' })

  assert.deepEqual(said, [{ kind: 'error', reason: 'missing' }])
})
