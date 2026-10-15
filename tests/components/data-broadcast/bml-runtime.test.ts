import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

import {
  BmlRuntime,
  type RuntimeOptions,
} from '@/components/data-broadcast/bml-runtime'
import type { BmlCatalog } from '@/lib/bml/catalog'
import type { ReceiverId } from '@/lib/bml/line'
import {
  MOST_REGISTER,
  RUNTIME_ORIGIN,
  programmeOnAir,
  runtimeMessageFrom,
  type PlayerMessage,
  type RuntimeMessage,
} from '@/lib/bml/messages'
import type { BmlModule, ResourceKind } from '@/lib/bml/resources'
import { FOREVER } from '@/lib/bml/mng'
import {
  FakeBitmap,
  fakeFrame,
  vmEvaluator,
  type FakeCanvas,
  type FakeElement,
} from '@/tests/components/data-broadcast/frame-fakes'
import {
  MEND,
  chunk,
  fram,
  mhdr,
  mng,
  picture,
  term,
} from '@/tests/lib/bml/mng-files'

const VELA = 'https://vela.example'

function frame(
  options: { drawFails?: boolean; decode?: RuntimeOptions['decode'] } = {},
) {
  const made = fakeFrame(VELA)
  const runtime = new BmlRuntime(
    made.window,
    made.plane as unknown as HTMLElement,
    VELA,
    {
      evaluate: vmEvaluator(),
      now: () => made.timers.now,
      mount: options.drawFails
        ? () => {
            throw new Error('cannot draw')
          }
        : undefined,
      decode: options.decode,
    },
  )
  const send = (
    data: PlayerMessage,
    origin = VELA,
    source: unknown = made.parent,
  ) => runtime.receive({ origin, source, data } as MessageEvent)
  const heard = () =>
    (made.said as RuntimeMessage[]).filter(
      (message) => message.kind !== 'script',
    )
  const scripts = () =>
    (made.said as RuntimeMessage[])
      .filter((message) => message.kind === 'script')
      .map((message) => (message.kind === 'script' ? message.state : ''))
  const element = (id: string): FakeElement | null => made.plane.find('id', id)
  const focused = (): string | null =>
    made.plane.find('data-bml-focus', '')?.getAttribute('id') ?? null

  return {
    ...made,
    runtime,
    send,
    heard,
    scripts,
    element,
    focused,
    forget: () => {
      made.said.length = 0
    },
  }
}

const text = (value: string) => new TextEncoder().encode(value)

function bml(body: string, head = ''): string {
  return `<?xml version="1.0"?><bml><head>${head}</head><body>${body}</body></bml>`
}

function module(
  id: number,
  resources: Record<string, [ResourceKind, string]>,
  tag = 0x40,
  version = 1,
): BmlModule {
  return {
    tag,
    id,
    version,
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
    {
      tag: 0x60,
      downloadId: 2,
      modules: [{ id: 0, version: 1, size: 0, resources: [] }],
    },
  ],
}

const STARTUP = bml(
  '<object type="video/X-arib-mpeg2" style="left: 480px; top: 0px; width: 480px; height: 270px"/>' +
    '<a id="next" href="~/0001/next.bml" style="nav-index: 0; nav-down: 1">next</a>' +
    '<a id="gone" href="gone.bml" style="nav-index: 1; nav-up: 0; nav-down: 2">gone</a>' +
    '<p id="script" onclick="go()" style="nav-index: 2; nav-up: 1">script</p>',
  '<script>function go() { browser.launchDocument("~/0001/next.bml") }</script>',
)

const NEXT = bml(
  '<object type="video/X-arib-mpeg2" style="left: 0px; top: 0px; width: 320px; height: 180px"/>',
)

const NEXT_RECT = { left: 0, top: 0, width: 320, height: 180 }

const START_RECT = { left: 480, top: 0, width: 480, height: 270 }

function opened(startup = STARTUP, more: BmlModule[] = []) {
  const opening = frame()

  opening.send({ kind: 'catalog', catalog: CATALOG })
  opening.send({
    kind: 'module',
    module: module(0, { 'startup.bml': ['bml', startup] }),
  })
  more.forEach((held) => opening.send({ kind: 'module', module: held }))
  opening.send({ kind: 'open' })

  return opening
}

test('opening draws the start document and tells the player where the video goes and which keys it takes', () => {
  const { heard, focused } = opened()

  assert.deepEqual(heard(), [
    { kind: 'videoRect', rect: START_RECT },
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
  assert.equal(focused(), 'next')
})

test('opening at the start document of another component draws that one', () => {
  const opening = frame()

  opening.send({ kind: 'catalog', catalog: CATALOG })
  opening.send({
    kind: 'module',
    module: module(0, { 'startup.bml': ['bml', STARTUP] }),
  })
  opening.send({
    kind: 'module',
    module: module(0, { 'startup.bml': ['bml', NEXT] }, 0x60),
  })
  opening.send({ kind: 'open', startup: '/60/0000/startup.bml' })

  assert.deepEqual(opening.heard()[0], { kind: 'videoRect', rect: NEXT_RECT })
})

test('opening with no catalog, or no start document, says it is missing', () => {
  const bare = frame()

  bare.send({ kind: 'open' })

  const empty = frame()

  empty.send({ kind: 'catalog', catalog: CATALOG })
  empty.send({ kind: 'module', module: module(0, {}) })
  empty.send({ kind: 'open' })

  assert.deepEqual(bare.heard(), [{ kind: 'error', reason: 'missing' }])
  assert.deepEqual(empty.heard(), [{ kind: 'error', reason: 'missing' }])
})

test('a link into a module that has not arrived waits for it, then opens', () => {
  const { heard, send, forget } = opened()

  forget()
  send({ kind: 'key', key: 'enter' })

  assert.deepEqual(heard(), [{ kind: 'waiting', waiting: true }])

  send({ kind: 'module', module: module(1, { 'next.bml': ['bml', NEXT] }) })

  assert.deepEqual(heard().slice(1, 3), [
    { kind: 'waiting', waiting: false },
    { kind: 'videoRect', rect: NEXT_RECT },
  ])
})

test('a link to a resource its arrived module does not hold is missing, not waited for', () => {
  const { heard, send, forget } = opened()

  forget()
  send({ kind: 'key', key: 'down' })
  send({ kind: 'key', key: 'enter' })

  assert.deepEqual(heard(), [{ kind: 'error', reason: 'missing' }])
})

test('a module that arrives without the resource waited for ends the wait as missing', () => {
  const { heard, send, forget } = opened()

  forget()
  send({ kind: 'key', key: 'enter' })
  send({ kind: 'module', module: module(1, { 'other.bml': ['bml', NEXT] }) })

  assert.deepEqual(heard(), [
    { kind: 'waiting', waiting: true },
    { kind: 'waiting', waiting: false },
    { kind: 'error', reason: 'missing' },
  ])
})

test('deciding on an element with a handler runs it, and a handler that launches a document moves there once it has ended', () => {
  const { heard, send, forget, scripts } = opened(STARTUP, [
    module(1, { 'next.bml': ['bml', NEXT] }),
  ])

  forget()
  send({ kind: 'key', key: 'down' })
  send({ kind: 'key', key: 'down' })
  send({ kind: 'key', key: 'enter' })

  assert.deepEqual(heard()[0], { kind: 'videoRect', rect: NEXT_RECT })
  assert.deepEqual(
    heard().map((message) => message.kind),
    ['videoRect', 'usedKeys'],
  )
  assert.deepEqual(scripts(), ['running', 'done'])
})

test('a start document that is not well formed, not BML text or not decoded is an error', () => {
  const cases: [ResourceKind, string, string][] = [
    ['bml', '<bml><body><p></bml>', 'malformed'],
    ['css', 'p {}', 'malformed'],
    ['undecoded', STARTUP, 'undecoded'],
  ]

  for (const [kind, body, reason] of cases) {
    const { heard, send } = frame()

    send({ kind: 'catalog', catalog: CATALOG })
    send({ kind: 'module', module: module(0, { 'startup.bml': [kind, body] }) })
    send({ kind: 'open' })

    assert.deepEqual(heard(), [{ kind: 'error', reason }], kind)
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
    const { heard, send } = frame({ drawFails: true })
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

    assert.deepEqual(heard(), [{ kind: 'error', reason: 'malformed' }])
    assert.equal(made.length, 2)
    assert.deepEqual([...released].sort(), [...made].sort())
  } finally {
    mock.restoreAll()
  }
})

test('what does not come from the player’s window in Vela’s origin is not heard', () => {
  const { heard, send } = frame()

  send({ kind: 'catalog', catalog: CATALOG }, 'https://elsewhere.example')
  send({ kind: 'catalog', catalog: CATALOG }, VELA, {})
  send({ kind: 'open' })

  assert.deepEqual(heard(), [{ kind: 'error', reason: 'missing' }])
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
  const { heard, send } = frame()

  send({ kind: 'catalog', catalog: listing(1) })
  send({ kind: 'module', module: versioned(0, 1, first) })
  send({ kind: 'catalog', catalog: listing(2) })
  send({ kind: 'open' })

  assert.deepEqual(heard()[0], {
    kind: 'videoRect',
    rect: { left: 0, top: 0, width: 480, height: 270 },
  })

  send({ kind: 'module', module: versioned(0, 2, second) })
  send({ kind: 'module', module: versioned(0, 1, first) })
  send({ kind: 'open' })

  assert.deepEqual(heard().at(-2), {
    kind: 'videoRect',
    rect: { left: 480, top: 270, width: 480, height: 270 },
  })
})

test('a module the catalog stops listing is let go', () => {
  const { heard, send } = frame()

  send({ kind: 'catalog', catalog: CATALOG })
  send({ kind: 'module', module: module(0, { 'startup.bml': ['bml', NEXT] }) })
  send({ kind: 'catalog', catalog: { ...CATALOG, carousels: [] } })
  send({ kind: 'open' })

  assert.deepEqual(heard(), [{ kind: 'error', reason: 'missing' }])
})

test('a page whose module the catalog stops listing gives way to the start document', () => {
  const { heard, send, forget } = opened(STARTUP, [
    module(1, { 'next.bml': ['bml', NEXT] }),
  ])

  send({ kind: 'key', key: 'enter' })
  forget()
  send({
    kind: 'catalog',
    catalog: {
      ...CATALOG,
      carousels: [
        { ...CATALOG.carousels[0], modules: [CATALOG.carousels[0].modules[0]] },
        CATALOG.carousels[1],
      ],
    },
  })

  assert.deepEqual(
    heard().filter((message) => message.kind === 'videoRect'),
    [{ kind: 'videoRect', rect: START_RECT }],
  )
})

const ENTRY = bml(
  '<p id="hidden">nothing to see</p>',
  '<bevent><beitem id="d" type="DataButtonPressed" subscribe="subscribe" onoccur="browser.launchDocument(\'/60/0000/startup.bml\', \'cut\')"/></bevent>',
).replace('<body>', '<body invisible="invisible">')

const FACE = bml(
  '<object type="video/X-arib-mpeg2" style="left: 560px; top: 60px; width: 360px; height: 203px"/>' +
    '<p id="menu" style="nav-index: 0" onkeydown="onKey()">menu</p>' +
    '<p id="news" style="visibility: hidden">news</p>' +
    '<p id="weather" style="visibility: hidden">weather</p>',
  '<script>' +
    'var shown = "";' +
    'function show(id) { if (shown) { document.getElementById(shown).normalStyle.visibility = "hidden" } shown = id; document.getElementById(id).normalStyle.visibility = "visible" }' +
    'function onKey() { var code = document.currentEvent.keyCode; if (code == 21) { show("news") } if (code == 22) { show("weather") } }' +
    '</script>',
)

test('an entry document that cannot be seen moves to the face it launches when the data button is pressed on it', () => {
  const { heard, element } = opened(ENTRY, [
    module(0, { 'startup.bml': ['bml', FACE] }, 0x60),
  ])

  assert.deepEqual(
    heard().filter((message) => message.kind === 'videoRect'),
    [
      { kind: 'videoRect', rect: null },
      {
        kind: 'videoRect',
        rect: { left: 560, top: 60, width: 360, height: 203 },
      },
    ],
  )
  assert.equal(element('hidden'), null)
  assert.ok(element('menu'))
})

const READS_ITSELF = bml(
  '<p id="hidden">nothing to see</p>',
  '<script>' +
    'var me = browser.getActiveDocument();' +
    'var component = me.substring(0, 4);' +
    'var network = browser.getProgramID(3).substring(2);' +
    'function init() { browser.launchDocument(component + "0001/face.bml", "cut") }' +
    '</script>',
).replace('<body>', '<body invisible="invisible" onload="init()">')

test('a recording begun part way into a second hands its programme to the first document, which reads at the top of its first script where it is and the network, and moves on to its face', () => {
  const { send, heard, element, warnings } = frame()

  send({ kind: 'catalog', catalog: CATALOG })
  send({ kind: 'memory', entries: [] })
  send({
    kind: 'programme',
    programme: programmeOnAir(CATALOG.service, {
      network: 0x7fe0,
      startsAt: Date.parse('2026-01-01T00:00:00.250Z') / 1000,
    }),
  })
  send({
    kind: 'module',
    module: module(0, { 'startup.bml': ['bml', READS_ITSELF] }),
  })
  send({ kind: 'module', module: module(1, { 'face.bml': ['bml', FACE] }) })
  send({ kind: 'line', line: 'none', receiverId: null })
  send({ kind: 'open' })

  assert.deepEqual(warnings, [])
  assert.equal(element('hidden'), null)
  assert.ok(element('menu'))
  assert.deepEqual(
    heard().filter((message) => message.kind === 'videoRect'),
    [
      {
        kind: 'videoRect',
        rect: { left: 560, top: 60, width: 360, height: 203 },
      },
    ],
  )
})

const ASKS_HOW_FAR = bml(
  '<p id="ask" style="nav-index: 0" onclick="browser.Ureg[0] = String(browser.getProgramRelativeTime())">ask</p>',
)

test('how far into the programme a document is, is answered from the time on air the player hands, back after a seek, and from the wall clock where it hands none', (t) => {
  const began = Date.parse('2026-01-01T00:00:00Z') / 1000

  t.mock.timers.enable({ apis: ['Date'], now: (began + 42.5) * 1000 })

  const { runtime, send } = opened(ASKS_HOW_FAR)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg
  const asked = () => {
    send({ kind: 'key', key: 'enter' })

    return registers[0]
  }

  send({
    kind: 'programme',
    programme: programmeOnAir(CATALOG.service, {
      network: null,
      startsAt: began,
    }),
  })

  assert.equal(asked(), '42')

  send({ kind: 'clock', seconds: began + 12.75 })

  assert.equal(asked(), '12')

  send({ kind: 'clock', seconds: began + 3.25 })

  assert.equal(asked(), '3')
})

const READS_THE_TIME = bml(
  '<p id="ask" style="nav-index: 0" onclick="ask()">ask</p>',
  '<script>' +
    'var ticked = []; browser.setInterval("tick()", 1000, 0);' +
    'function ask() { browser.Ureg[0] = [new Date().getTime(), Date.now(), browser.getProgramRelativeTime()].join(",") }' +
    'function tick() { ticked.push(new Date().getTime()); browser.Ureg[1] = ticked.join(",") }' +
    '</script>',
)

function readsTheTime() {
  const opening = opened(READS_THE_TIME)
  const registers = (
    opening.runtime as unknown as { registers: { Ureg: string[] } }
  ).registers.Ureg
  const asked = () => {
    opening.send({ kind: 'key', key: 'enter' })

    return registers[0]
  }

  return { ...opening, asked, ticked: () => registers[1] }
}

test('in a recording, a document’s dates without arguments and Date.now() read when the recording began and the position played, as its elapsed time does: they stand while paused, its timers going on, and move with a seek back or forward', (t) => {
  const began = Date.parse('2026-01-01T00:00:00Z') / 1000

  t.mock.timers.enable({
    apis: ['Date'],
    now: Date.parse('2026-03-01T09:00:00Z'),
  })

  const { send, timers, asked, ticked } = readsTheTime()
  const at = (seconds: number) => {
    const ms = (began + seconds) * 1000

    return [ms, ms, Math.floor(seconds)].join(',')
  }

  send({
    kind: 'programme',
    programme: programmeOnAir(CATALOG.service, {
      network: null,
      startsAt: began,
    }),
  })
  send({ kind: 'clock', seconds: began + 12.75 })

  assert.equal(asked(), at(12.75))

  t.mock.timers.tick(3000)
  timers.tick(1000)
  timers.tick(1000)
  timers.tick(1000)

  assert.equal(asked(), at(12.75))
  assert.equal(
    ticked(),
    Array(3)
      .fill((began + 12.75) * 1000)
      .join(','),
  )

  send({ kind: 'clock', seconds: began + 3.25 })

  assert.equal(asked(), at(3.25))

  send({ kind: 'clock', seconds: began + 3600.5 })

  assert.equal(asked(), at(3600.5))
})

test('live, a document’s dates without arguments and Date.now() read the wall clock', (t) => {
  const wall = Date.parse('2026-03-01T09:00:00.500Z')

  t.mock.timers.enable({ apis: ['Date'], now: wall })

  const { send, asked } = readsTheTime()

  send({
    kind: 'programme',
    programme: programmeOnAir(CATALOG.service, {
      network: null,
      startsAt: Math.floor(wall / 1000) - 30,
    }),
  })

  assert.equal(asked(), [wall, wall, 30].join(','))

  t.mock.timers.tick(1500)

  assert.equal(asked(), [wall + 1500, wall + 1500, 32].join(','))
})

const WRITES_ITS_NOW = bml(
  '<p id="ask" style="nav-index: 0" onclick="ask()">ask</p>',
  '<script>' +
    'Date.now = function () { return new Date().getTime() };' +
    'function ask() { browser.Ureg[0] = [new Date().getTime(), Date.now()].join(",") }' +
    '</script>',
)

test('live, a document that writes a Date.now of its own reading the date still reads the wall clock', (t) => {
  const wall = Date.parse('2026-03-01T09:00:00.500Z')

  t.mock.timers.enable({ apis: ['Date'], now: wall })

  const { runtime, send } = opened(WRITES_ITS_NOW)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  send({ kind: 'key', key: 'enter' })

  assert.equal(registers[0], [wall, wall].join(','))
})

const MAKES_DATES = bml(
  '<p id="ask" style="nav-index: 0" onclick="ask()">ask</p>',
  '<script>' +
    'function ask() { var start = browser.epgGetEventStartTime(); browser.Ureg[0] = [' +
    'new Date(2001, 0, 2, 3, 4, 5).getTime(), new Date(0).getTime(), new Date("2001-01-02T03:04:05Z").getTime(), Date.parse("2001-01-02T03:04:05Z"), Date.UTC(2001, 0, 2),' +
    'start.getTime(), start instanceof Date, new Date() instanceof Date, browser.addDate(new Date(), 1, 1) instanceof Date, Date() === new Date().toString()' +
    '].join(",") }' +
    '</script>',
)

test('in a recording, a document’s dates made from given arguments, parsed or in UTC are made as before, and the dates the runtime hands it are dates to it', () => {
  const began = Date.parse('2026-01-01T00:00:00Z') / 1000
  const { runtime, send } = opened(MAKES_DATES)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  send({
    kind: 'programme',
    programme: programmeOnAir(CATALOG.service, {
      network: null,
      startsAt: began,
    }),
  })
  send({ kind: 'clock', seconds: began + 12.75 })
  send({ kind: 'key', key: 'enter' })

  assert.equal(
    registers[0],
    [
      new Date(2001, 0, 2, 3, 4, 5).getTime(),
      0,
      Date.UTC(2001, 0, 2, 3, 4, 5),
      Date.UTC(2001, 0, 2, 3, 4, 5),
      Date.UTC(2001, 0, 2),
      began * 1000,
      true,
      true,
      true,
      true,
    ].join(','),
  )
})

test('a key goes to the focused element’s handler with its code, and the handler reaches the page only through wrappers', () => {
  const { send, element } = opened(ENTRY, [
    module(0, { 'startup.bml': ['bml', FACE] }, 0x60),
  ])

  send({ kind: 'key', key: 'blue' })

  assert.equal(element('news')?.style.getPropertyValue('visibility'), 'visible')
  assert.equal(element('weather')?.style.getPropertyValue('visibility'), '')

  send({ kind: 'key', key: 'red' })

  assert.equal(element('news')?.style.getPropertyValue('visibility'), 'hidden')
  assert.equal(
    element('weather')?.style.getPropertyValue('visibility'),
    'visible',
  )
})

const KEYS = [
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
]

const LEAVING_EARLY = bml(
  '<p id="p" style="nav-index: 0">p</p>',
  '<script>browser.launchDocument("/60/0000/later.bml"); function init() { browser.launchDocument("~/0001/next.bml") }</script>',
).replace('<body>', '<body onload="init()">')

test('a document that moves on to a module still awaited runs none of the rest of itself, not its onload either', () => {
  const { send, heard, forget } = opened(LEAVING_EARLY, [
    module(1, { 'next.bml': ['bml', NEXT] }),
  ])

  assert.deepEqual(heard(), [{ kind: 'waiting', waiting: true }])
  forget()
  send({
    kind: 'module',
    module: module(
      0,
      { 'later.bml': ['bml', bml('<p id="later">l</p>')] },
      0x60,
    ),
  })

  assert.deepEqual(heard(), [
    { kind: 'waiting', waiting: false },
    { kind: 'videoRect', rect: null },
    { kind: 'usedKeys', keys: KEYS },
  ])
})

const NAMING_ONLOAD = bml(
  '<p id="p">p</p>',
  '<script>function onload() { document.getElementById("p").firstChild.data = "loaded" }</script>',
).replace('<body>', '<body onload="onload()">')

test('a document may name its own onload function, as the frame’s own has already happened', () => {
  const { element } = opened(NAMING_ONLOAD)

  assert.equal(element('p')?.text, 'loaded')
})

const QUITTING = bml(
  '<p id="q" onclick="browser.quitDocument()" style="nav-index: 0">q</p>',
)

test('a document that quits is taken down and the player is told to close', () => {
  const { send, heard, element, forget } = opened(QUITTING)

  forget()
  send({ kind: 'key', key: 'enter' })

  assert.deepEqual(heard(), [{ kind: 'exit' }])
  assert.equal(element('q'), null)
})

const ASKING = bml(
  '<p id="p" style="nav-index: 0">p</p>',
  '<script>browser.Ureg[0] = [browser.isBeingBroadcast("~/0001/x.bml"), browser.isBeingBroadcast("/60/0000"), browser.isBeingBroadcast("/40/0007/x.bml"), browser.isBeingBroadcast("/70/0000/x.bml")].join(",")</script>',
)

test('whether a module is being broadcast is answered from the catalog', () => {
  const { runtime } = opened(ASKING)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  assert.equal(registers[0], '1,1,0,0')
})

const HANDLING = bml(
  '<div id="c" onkeydown="document.getElementById(\'p\').firstChild.data = \'key \' + document.currentEvent.keyCode"><p id="p">p</p></div>' +
    '<p id="n" style="nav-index: 0; nav-down: 0">n</p>',
  '<script>function init() { document.getElementById("c").focus() }</script>',
).replace('<body>', '<body onload="init()">')

test('a script may focus an element without a nav-index, which then takes the keys while the arrows lead nowhere', () => {
  const { send, element, focused } = opened(HANDLING)

  assert.equal(focused(), 'c')

  send({ kind: 'key', key: 'down' })

  assert.equal(focused(), 'c')
  assert.equal(element('p')?.text, 'key 2')
})

const PROBING = bml(
  '<p id="p" style="nav-index: 0">p</p>',
  '<script>' +
    'var e = document.getElementById("p");' +
    'var seen = [typeof e.childNodes, typeof e.setAttribute, typeof e.style, typeof e.attributes, typeof e.ownerDocument, typeof document.createElement, typeof window, typeof parent, typeof setTimeout];' +
    'browser.Ureg[0] = seen.join(",");' +
    'browser.Ureg[1] = e.tagName + "/" + e.id + "/" + e.normalStyle.navIndex;' +
    '</script>',
)

test('document.getElementById gives a wrapper, not the element the page is drawn with, and the frame’s window is out of reach', () => {
  const { runtime, heard } = opened(PROBING)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  assert.deepEqual(heard()[0], { kind: 'videoRect', rect: null })
  assert.equal(
    registers[0],
    'object,function,undefined,undefined,undefined,undefined,undefined,undefined,undefined',
  )
  assert.equal(registers[1], 'P/p/0')
})

const WANDERING = bml(
  '<p id="a" style="nav-index: 0; nav-down: 1" onblur="browser.Ureg[0] += \'blur:a \'" onfocus="browser.Ureg[0] += \'focus:a \'">a</p>' +
    '<p id="b" style="nav-index: 1; nav-up: 0" onfocus="browser.Ureg[0] += \'focus:b \'" onclick="document.getElementById(\'a\').focus()">b</p>',
)

test('moving the focus runs onblur on the element left and onfocus on the one reached, and a script may move it too', () => {
  const { runtime, send, focused } = opened(WANDERING)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  assert.equal(focused(), 'a')
  assert.equal(registers[0], '')

  send({ kind: 'key', key: 'down' })

  assert.equal(focused(), 'b')
  assert.equal(registers[0], 'blur:a focus:b ')

  send({ kind: 'key', key: 'enter' })

  assert.equal(focused(), 'a')
  assert.equal(registers[0], 'blur:a focus:b focus:a ')
})

const TIMED = bml(
  '<p id="count">0</p>',
  '<script>' +
    'var ticks = 0; var timer = browser.setInterval("tick()", 500, 3);' +
    'function tick() { ticks += 1; browser.Ureg[0] = String(ticks) + ":" + document.currentEvent.type }' +
    '</script>',
)

test('a timer runs its code at each interval for as many times as asked, and is cleared with the document', () => {
  const { runtime, timers, send } = opened(TIMED, [
    module(1, { 'next.bml': ['bml', NEXT] }),
  ])
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  assert.equal(timers.pending, 1)
  timers.tick(500)
  timers.tick(500)

  assert.equal(registers[0], '2:TimerFired')

  timers.tick(500)
  timers.tick(500)

  assert.equal(registers[0], '3:TimerFired')
  assert.equal(timers.pending, 0)

  send({ kind: 'close' })
  send({ kind: 'open' })
  assert.equal(timers.pending, 1)
  send({ kind: 'close' })
  assert.equal(timers.pending, 0)
})

const REMEMBERING = bml(
  '<p id="p">p</p>',
  '<script>' +
    'var visits = browser.readPersistentArray("visits", "U:1B");' +
    'var count = visits[0] + 1;' +
    'browser.Ureg[0] = String(browser.writePersistentArray("visits", "U:1B", [count]));' +
    'browser.Ureg[1] = String(browser.writePersistentArray("big", "S:2V", [new Array(70).join("x")]));' +
    '</script>',
)

test('what a document writes to the persistent memory is handed to the player, what the player hands is read back, and a write past the limit fails', () => {
  const { runtime, heard, send, forget } = opened(REMEMBERING)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  assert.deepEqual(heard()[0], {
    kind: 'memory',
    name: 'visits',
    value: 'AQ==',
  })
  assert.equal(registers[0], '1')
  assert.equal(registers[1], 'NaN')

  forget()
  send({
    kind: 'memory',
    entries: [['visits', 'KQ==']],
  })
  send({ kind: 'open' })

  assert.deepEqual(heard()[0], {
    kind: 'memory',
    name: 'visits',
    value: 'Kg==',
  })
})

const CONNECTING = bml(
  '<p id="p">p</p>',
  '<script>' +
    'var a = browser.connect("host", 80);' +
    'var b = browser.playRomSound("romsound://1");' +
    'var c = browser.noSuchFunction(1, 2);' +
    'browser.Ureg[0] = [a, b, c].join(",");' +
    '</script>',
)

test('a function that communicates fails and is told to the player, one that is ignored succeeds, and one unknown fails with a warning, and the script goes on', () => {
  const { runtime, heard, warnings } = opened(CONNECTING)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  assert.deepEqual(heard()[0], { kind: 'unsupported', what: 'connect' })
  assert.equal(registers[0], 'NaN,1,NaN')
  assert.ok(
    warnings.some((line) =>
      line.includes('unsupported browser function: noSuchFunction'),
    ),
  )
})

const FAILING = bml(
  '<p id="p">p</p>',
  '<script>this is not a script</script><script>browser.Ureg[0] = "after"</script>',
)

test('a script that fails is warned of and the next script still runs', () => {
  const { runtime, heard, warnings } = opened(FAILING)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  assert.deepEqual(heard()[0], { kind: 'videoRect', rect: null })
  assert.equal(registers[0], 'after')
  assert.ok(warnings.some((line) => line.includes('script failed')))
})

const SLOW = bml(
  '<p id="p" style="nav-index: 0" onclick="browser.Ureg[0] = \'slow\'">p</p>',
)

test('a run that takes longer than allowed is said to have overrun', () => {
  const made = fakeFrame(VELA)
  const runtime = new BmlRuntime(
    made.window,
    made.plane as unknown as HTMLElement,
    VELA,
    {
      evaluate: (code, scope) => {
        made.timers.now += code.includes('slow') ? 2500 : 0
        vmEvaluator()(code, scope)
      },
      now: () => made.timers.now,
    },
  )
  const send = (data: PlayerMessage) =>
    runtime.receive({ origin: VELA, source: made.parent, data } as MessageEvent)

  send({ kind: 'catalog', catalog: CATALOG })
  send({ kind: 'module', module: module(0, { 'startup.bml': ['bml', SLOW] }) })
  send({ kind: 'open' })
  made.said.length = 0
  send({ kind: 'key', key: 'enter' })

  assert.deepEqual(made.said, [
    { kind: 'script', state: 'running' },
    { kind: 'script', state: 'overran' },
  ])
})

const LISTENING = bml(
  '<p id="p">p</p>',
  '<bevent>' +
    '<beitem id="u" type="ModuleUpdated" module_ref="/40/0001" subscribe="subscribe" onoccur="browser.Ureg[0] += \'updated:\' + document.currentEvent.status + \':\' + document.currentEvent.moduleRef + \' \'"/>' +
    '<beitem id="m" type="EventMessageFired" message_group_id="0" message_id="7" subscribe="subscribe" onoccur="browser.Ureg[1] = document.currentEvent.messageId + \':\' + document.currentEvent.privateData"/>' +
    '<beitem id="q" type="EventMessageFired" message_group_id="0" message_id="8" onoccur="browser.Ureg[2] = \'quiet\'"/>' +
    '<beitem id="l" type="ModuleLocked" module_ref="~/0001" subscribe="subscribe" onoccur="browser.Ureg[3] = \'locked:\' + document.currentEvent.moduleRef"/>' +
    '</bevent>' +
    '<script>browser.lockModuleOnMemoryEx("~/0001")</script>',
)

test('a module that comes in a new version, an event message and a locked module each reach the items that listen for them', () => {
  const { runtime, send, timers } = opened(LISTENING, [
    module(1, { 'next.bml': ['bml', NEXT] }),
  ])
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  timers.tick(0)
  assert.equal(registers[3], 'locked:/40/0001')

  send({
    kind: 'catalog',
    catalog: {
      ...CATALOG,
      carousels: [
        {
          ...CATALOG.carousels[0],
          modules: [
            { id: 0, version: 1, size: 0, resources: [] },
            { id: 1, version: 2, size: 0, resources: [] },
          ],
        },
      ],
    },
  })
  send({
    kind: 'module',
    module: module(1, { 'next.bml': ['bml', NEXT] }, 0x40, 2),
  })
  assert.equal(registers[0], 'updated:0:/40/0001 ')

  send({ kind: 'catalog', catalog: listing(1) })
  assert.equal(registers[0], 'updated:0:/40/0001 updated:1:/40/0001 ')

  send({
    kind: 'event',
    event: {
      group: 0,
      id: 7,
      type: 1,
      immediate: true,
      at: 0,
      privateData: text('hello'),
    },
  })
  send({
    kind: 'event',
    event: {
      group: 0,
      id: 8,
      type: 1,
      immediate: true,
      at: 0,
      privateData: text('no'),
    },
  })
  assert.equal(registers[1], '7:hello')
  assert.equal(registers[2], '')
})

const LISTENING_BY_STREAM = bml(
  '<p>listening</p>',
  '<bevent>' +
    '<beitem id="carried" type="EventMessageFired" es_ref="/40" message_group_id="0" message_id="7" subscribe="subscribe" onoccur="browser.Ureg[0] += \'carried \'"/>' +
    '<beitem id="elsewhere" type="EventMessageFired" es_ref="/72" message_group_id="0" message_id="7" subscribe="subscribe" onoccur="browser.Ureg[0] += \'elsewhere \'"/>' +
    '<beitem id="one" type="ModuleUpdated" module_ref="/40/0001" subscribe="subscribe" onoccur="browser.Ureg[1] += \'one \'"/>' +
    '<beitem id="two" type="ModuleUpdated" module_ref="/60/0000" subscribe="subscribe" onoccur="browser.Ureg[1] += \'two \'"/>' +
    '<beitem id="quiet" type="ModuleUpdated" module_ref="/40/0001" onoccur="browser.Ureg[1] += \'quiet \'"/>' +
    '</bevent>',
)

test('an event message that names its stream reaches only the item whose es_ref names that stream, though the catalog does not carry it', () => {
  const { runtime, send } = opened(LISTENING_BY_STREAM)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg
  const event = (componentTag: number) => ({
    group: 0,
    id: 7,
    type: 1,
    immediate: true,
    at: 0,
    privateData: new Uint8Array(0),
    componentTag,
  })

  send({ kind: 'event', event: event(0x72) })
  assert.equal(registers[0], 'elsewhere ')

  send({ kind: 'event', event: event(0x40) })
  assert.equal(registers[0], 'elsewhere carried ')
})

test('an event message reaches the item whose es_ref names a stream the broadcast carries, and a module in a new version reaches only the subscribed items that name it', () => {
  const { runtime, send } = opened(LISTENING_BY_STREAM, [
    module(1, { 'one.bml': ['bml', NEXT] }),
    module(0, { 'two.bml': ['bml', NEXT] }, 0x60),
  ])
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  send({
    kind: 'event',
    event: {
      group: 0,
      id: 7,
      type: 1,
      immediate: false,
      at: 90_000,
      privateData: new Uint8Array(0),
    },
  })
  assert.equal(registers[0], 'carried ')

  send({
    kind: 'catalog',
    catalog: {
      ...CATALOG,
      carousels: [
        {
          ...CATALOG.carousels[0],
          modules: [
            { id: 0, version: 1, size: 0, resources: [] },
            { id: 1, version: 2, size: 0, resources: [] },
          ],
        },
        CATALOG.carousels[1],
      ],
    },
  })
  send({
    kind: 'module',
    module: module(0, { 'two.bml': ['bml', NEXT] }, 0x60),
  })
  assert.equal(registers[1], '')

  send({
    kind: 'module',
    module: module(1, { 'one.bml': ['bml', NEXT] }, 0x40, 2),
  })
  assert.equal(registers[1], 'one ')
})

const RELOADING = bml(
  '<p id="p" style="nav-index: 0" onclick="browser.reloadActiveDocument()">p</p>',
  '<script>browser.Greg[0] = String(Number(browser.Greg[0] || "0") + 1); browser.Ureg[0] = browser.getActiveDocument()</script>',
)

test('reloading the active document draws it again from the start, and the registers stay', () => {
  const { runtime, send, heard } = opened(RELOADING)
  const registers = (
    runtime as unknown as { registers: { Ureg: string[]; Greg: string[] } }
  ).registers

  assert.equal(registers.Greg[0], '1')
  assert.equal(registers.Ureg[0], '/40/0000/startup.bml')

  send({ kind: 'key', key: 'enter' })

  assert.equal(registers.Greg[0], '2')
  assert.equal(
    heard().filter((message) => message.kind === 'videoRect').length,
    2,
  )
})

const BOUNCING = bml(
  '<p>a</p>',
  '<script>browser.launchDocument("startup.bml")</script>',
)

test('a document that launches itself again from its own script is followed only so far, then given up as broken', () => {
  const { heard } = opened(BOUNCING)

  assert.deepEqual(heard().at(-1), { kind: 'error', reason: 'malformed' })
})

const KEYED = bml(
  '<p id="one" style="nav-index: 0" accesskey="1">one</p>' +
    '<p id="two" style="nav-index: 1" accesskey="2">two</p>',
)

test('a digit focuses the element whose access key it is', () => {
  const { send, focused } = opened(KEYED)

  assert.equal(focused(), 'one')
  send({ kind: 'key', key: '2' })
  assert.equal(focused(), 'two')
  send({ kind: 'key', key: '9' })
  assert.equal(focused(), 'two')
})

const TABLED = bml(
  '<p id="p">p</p>',
  '<script>' +
    'var t = new CSVTable("table.csv", "U:1B,S:1V");' +
    'var b = new BinaryTable("table.bin", "0,U:1B,U:1B");' +
    'browser.Ureg[0] = t.nrow + ":" + t.toString(1, 1) + ":" + b.nrow + ":" + b.toNumber(1, 1);' +
    '</script>',
)

test('a document reads the tables of its module', () => {
  const { runtime } = opened(TABLED, [
    module(0, {
      'startup.bml': ['bml', TABLED],
      'table.csv': ['binary', '1,a\n2,b\n'],
      'table.bin': ['binary', '\x01\x02\x03\x04'],
    }),
  ])
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  assert.equal(registers[0], '2:b:2:4')
})

const PICTURED = bml(
  '<object id="i" type="image/X-arib-png" data="pic.png"/>',
  '<script>' +
    'var i = document.getElementById("i");' +
    'var before = i.data;' +
    'i.data = before.substring(0, 3) + "2.png";' +
    'browser.Ureg[0] = before + ":" + i.data;' +
    '</script>',
)

test('a script reads the reference the document gave an image and what it set afterwards', () => {
  const { runtime, warnings } = opened(PICTURED)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  assert.equal(registers[0], 'pic.png:pic2.png')
  assert.deepEqual(warnings, [
    'data broadcast: missing image: pic.png',
    'data broadcast: missing image: pic2.png',
  ])
})

const TABLE_GONE = bml(
  '<p id="p">p</p>',
  '<script>' +
    'var b = new BinaryTable("gone.bin", "0,U:1B");' +
    'browser.Ureg[0] = b == null ? "none" : "table";' +
    '</script>',
)

test('a table whose file is not in the module is null, as a receiver answers', () => {
  const { runtime } = opened(TABLE_GONE)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  assert.equal(registers[0], 'none')
})

const LOCKING_ELSEWHERE = bml(
  '<p id="p">p</p>',
  '<bevent>' +
    '<beitem id="l" type="ModuleLocked" module_ref="/40/0009" subscribe="subscribe" onoccur="browser.Ureg[1] = \'locked:\' + document.currentEvent.status + \':\' + document.currentEvent.moduleRef"/>' +
    '</bevent>' +
    '<script>' +
    'browser.Ureg[0] = [browser.lockModuleOnMemoryEx("/70/0001"), browser.lockModuleOnMemoryEx("/40/0009"), browser.lockModuleOnMemoryEx("~/0001")].join(",");' +
    '</script>',
)

test('locking a module no component carries answers -3, one the carousel does not list is heard of as not found, and one awaited is heard of when it comes', () => {
  const { runtime, send, timers } = opened(LOCKING_ELSEWHERE)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  assert.equal(registers[0], '-3,1,1')
  timers.tick(0)
  assert.equal(registers[1], 'locked:-2:/40/0009')

  send({ kind: 'module', module: module(1, { 'next.bml': ['bml', NEXT] }) })
  assert.equal(
    (runtime as unknown as { locked: Set<string> }).locked.has('64/1'),
    true,
  )
})

const GETTING_READY = bml(
  '<p id="p">p</p>' +
    '<object type="video/X-arib-mpeg2" style="left: 0px; top: 0px; width: 480px; height: 270px"/>',
  '<bevent>' +
    '<beitem id="d" type="DataButtonPressed" onoccur="browser.Ureg[0] += \'pressed \'; document.getElementById(\'body\').invisible = false"/>' +
    '</bevent>' +
    '<script>browser.setInterval("document.getElementById(\'d\').subscribe = true", 3000, 1)</script>',
).replace('<body>', '<body id="body" invisible="invisible">')

test('an entry document that listens for the data button only once it is ready hears the press then, shows itself and is pressed no more, and the video is whole until it shows itself', () => {
  const { runtime, timers, heard, element } = opened(GETTING_READY)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  assert.deepEqual(heard()[0], { kind: 'videoRect', rect: null })

  for (let round = 0; round < 5; round += 1) {
    timers.tick(500)
  }

  assert.equal(registers[0], '')
  timers.tick(3000)
  timers.tick(500)
  assert.equal(registers[0], 'pressed ')
  assert.equal(element('body')?.getAttribute('data-bml-attr-invisible'), null)
  assert.deepEqual(heard().at(-1), {
    kind: 'videoRect',
    rect: { left: 0, top: 0, width: 480, height: 270 },
  })

  for (let round = 0; round < 10; round += 1) {
    timers.tick(500)
  }

  assert.equal(registers[0], 'pressed ')
})

const LOADED = bml(
  '<p id="p" style="nav-index: 0">p</p>',
  '<script>browser.Ureg[0] = "script"</script>',
).replace(
  '<body>',
  '<body onload="browser.Ureg[0] += \' load:\' + document.currentEvent.type">',
)

test('the body’s onload runs after the scripts and before the focus settles', () => {
  const { runtime, heard } = opened(LOADED)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  assert.equal(registers[0], 'script load:load')
  assert.deepEqual(heard()[0], { kind: 'videoRect', rect: null })
})

const ENTRY_LATER = bml(
  '<p id="hidden">entry</p>',
  '<bevent><beitem id="pressed" type="DataButtonPressed" subscribe="subscribe" onoccur="go()"/></bevent>' +
    '<script>' +
    'var ready = false; var presses = 0;' +
    'function go() { presses += 1; browser.Ureg[0] = String(presses); if (ready) { browser.launchDocument("/60/0000/startup.bml", "cut") } }' +
    'browser.setInterval("ready = true", 300, 1);' +
    '</script>',
).replace('<body>', '<body invisible="invisible">')

test('an entry document marked invisible that readies itself on a timer is given the data button again a moment later, and the face it then launches is not', () => {
  const { runtime, heard, element, timers } = opened(ENTRY_LATER, [
    module(0, { 'startup.bml': ['bml', FACE] }, 0x60),
  ])
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  assert.equal(registers[0], '1')
  assert.ok(element('hidden'))

  timers.tick(300)
  assert.equal(registers[0], '1')

  timers.tick(200)
  assert.equal(registers[0], '2')
  assert.equal(element('hidden'), null)
  assert.ok(element('menu'))
  assert.deepEqual(
    heard().filter((message) => message.kind === 'videoRect'),
    [
      { kind: 'videoRect', rect: null },
      {
        kind: 'videoRect',
        rect: { left: 560, top: 60, width: 360, height: 203 },
      },
    ],
  )

  timers.tick(500)
  timers.tick(500)
  assert.ok(element('menu'))
})

const NEVER_READY = bml('<p id="hidden">entry</p>').replace(
  '<body>',
  '<body invisible="invisible" onkeydown="browser.Ureg[0] += \'d\'" style="nav-index: 0">',
)

test('an entry document that never shows anything is given the data button for some seconds, then left', () => {
  const { runtime, timers } = opened(NEVER_READY)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  for (let round = 0; round < 10; round += 1) {
    timers.tick(500)
  }

  assert.equal(registers[0], 'd'.repeat(11))

  for (let round = 0; round < 20; round += 1) {
    timers.tick(500)
  }

  assert.equal(registers[0], 'd'.repeat(20))
})

const MIXED = bml(
  '<p id="face">face</p>',
  '<script>' +
    'var a = browser.getBrowserSupport("ARIB", "APIGroup", "Ctrl.Basic");' +
    'var b = browser.noSuchThing(1);' +
    'var c = browser.getProgramID(3);' +
    'var d = browser.detectComponent("/40") + "" + browser.detectComponent("/50");' +
    'browser.Ureg[0] = [a, b, c, d].join(",");' +
    'var start = new Date(2026, 0, 1, 0, 0, 0);' +
    'var later = browser.addDate(start, 90, 2);' +
    'browser.Ureg[1] = [browser.subDate(later, start, 1), browser.subDate(later, start, 2), browser.subDate(later, start, 3), browser.subDate(start, later, 4), browser.subDate(later, start, 0), browser.addDate("x", 1, 1)].join(",");' +
    'undefinedThing.property = 1;' +
    'browser.Ureg[2] = "not reached";' +
    '</script>' +
    '<script>browser.Ureg[3] = "next script"</script>',
)

test('a face whose script calls what is not supported, asks after the programme and the dates, then fails, stays standing and the next script runs', () => {
  const made = opened()
  const { runtime, send, forget, heard, element, warnings } = made

  forget()
  send({
    kind: 'programme',
    programme: {
      service: 1024,
      event: null,
      network: 32736,
      stream: null,
      startsAt: null,
    },
  })
  send({ kind: 'module', module: module(0, { 'startup.bml': ['bml', MIXED] }) })
  send({ kind: 'open' })

  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  assert.equal(registers[0], '1,NaN,0x7fe0,10')
  assert.equal(registers[1], '5400,90,1,0,5400000,NaN')
  assert.equal(registers[2], '')
  assert.equal(registers[3], 'next script')
  assert.ok(element('face'))
  assert.deepEqual(heard(), [
    { kind: 'videoRect', rect: null },
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
  assert.ok(
    warnings.some((line) =>
      line.includes('unsupported browser function: noSuchThing'),
    ),
  )
  assert.ok(
    warnings.some((line) => /script failed: ReferenceError: /.test(line)),
  )
})

const SUBSCRIBING = bml(
  '<p id="p">p</p>',
  '<bevent>' +
    '<beitem id="l" type="ModuleLocked" onoccur="browser.Ureg[0] = \'locked:\' + document.currentEvent.moduleRef"/>' +
    '<beitem id="m" type="EventMessageFired" message_group_id="0" message_id="7" subscribe="subscribe" onoccur="browser.Ureg[1] = \'fired\'"/>' +
    '</bevent>' +
    '<script>' +
    'var item = document.getElementById("l");' +
    'item.moduleRef = "~/0001"; item.subscribe = true;' +
    'var fired = document.getElementById("m");' +
    'browser.Ureg[2] = [fired.messageGroupId, fired.messageId, fired.messageVersion, item.moduleRef, item.esRef].join(",");' +
    'fired.messageId = 8;' +
    'browser.lockModuleOnMemoryEx("~/0001");' +
    '</script>',
)

test('a script may set what a beitem listens for: a module named afterwards reaches it, and a message id changed afterwards is the one listened for', () => {
  const { runtime, send, timers } = opened(SUBSCRIBING, [
    module(1, { 'next.bml': ['bml', NEXT] }),
  ])
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  timers.tick(0)
  assert.equal(registers[0], 'locked:/40/0001')
  assert.equal(registers[2], '0,7,NaN,~/0001,')

  send({
    kind: 'event',
    event: {
      group: 0,
      id: 7,
      type: 1,
      immediate: true,
      at: 0,
      privateData: new Uint8Array(0),
    },
  })
  assert.equal(registers[1], '')

  send({
    kind: 'event',
    event: {
      group: 0,
      id: 8,
      type: 1,
      immediate: true,
      at: 0,
      privateData: new Uint8Array(0),
    },
  })
  assert.equal(registers[1], 'fired')
})

const LISTENING_FOR_NPT = bml(
  '<p>npt</p>',
  '<bevent>' +
    '<beitem id="own" type="NPTReferred" subscribe="subscribe" onoccur="browser.Ureg[0] += document.currentEvent.status + \':\' + document.currentEvent.esRef + \':\' + browser.getNPT() + \' \'"/>' +
    '<beitem id="other" type="NPTReferred" es_ref="/60" subscribe="subscribe" onoccur="browser.Ureg[1] += document.currentEvent.esRef + \' \'"/>' +
    '<beitem id="quiet" type="NPTReferred" onoccur="browser.Ureg[2] += \'quiet \'"/>' +
    '</bevent>',
)

test('an NPTReferred item hears once that the NPT of the stream it names can be read, the stream carrying the document when it names none', () => {
  const { runtime, send, timers } = opened(LISTENING_FOR_NPT)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  timers.tick(0)
  assert.deepEqual(registers.slice(0, 3), ['', '', ''])

  send({ kind: 'npt', reading: { tag: 0x40, milliseconds: 5_000, rate: 1 } })
  send({ kind: 'npt', reading: { tag: 0x40, milliseconds: 9_000, rate: 1 } })
  assert.equal(registers[0], '0:/40:5000 ')
  assert.equal(registers[1], '')

  send({ kind: 'npt', reading: { tag: 0x60, milliseconds: 0, rate: 1 } })
  assert.equal(registers[1], '/60 ')
  assert.equal(registers[2], '')
})

test('a document opened after the NPT came hears of it once it has started', () => {
  const opening = frame()
  const registers = (
    opening.runtime as unknown as { registers: { Ureg: string[] } }
  ).registers.Ureg

  opening.send({ kind: 'catalog', catalog: CATALOG })
  opening.send({
    kind: 'module',
    module: module(0, { 'startup.bml': ['bml', LISTENING_FOR_NPT] }),
  })
  opening.send({
    kind: 'npt',
    reading: { tag: 0x40, milliseconds: 1_000, rate: 1 },
  })
  opening.send({ kind: 'open' })
  assert.equal(registers[0], '')

  opening.timers.tick(0)
  assert.equal(registers[0], '0:/40:1000 ')
})

test('getNPT reads the NPT of the stream carrying the document in whole milliseconds, running on from when it came at its rate, and fails while there is none', () => {
  const { runtime, send, timers } = opened(
    bml(
      '<p>npt</p>',
      '<script>function read() { browser.Ureg[5] = String(browser.getNPT()) }</script>',
    ),
  )
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg
  const shown = runtime as unknown as {
    execute: (code: string, event: null) => boolean
  }

  shown.execute('read()', null)
  assert.equal(registers[5], 'NaN')

  send({ kind: 'npt', reading: { tag: 0x60, milliseconds: 100, rate: 1 } })
  shown.execute('read()', null)
  assert.equal(registers[5], '100')

  send({ kind: 'npt', reading: { tag: 0x40, milliseconds: 2_000, rate: 0.5 } })
  timers.tick(1_001)
  shown.execute('read()', null)
  assert.equal(registers[5], '2500')
})

const B_CAS: ReceiverId = { caSystemId: 5, cardId: 'a1b2c3d4e5f6' }

function overTheLine(
  startup: string,
  line: 'on' | 'off' | 'none',
  receiverId: ReceiverId | null = null,
) {
  const opening = frame()

  opening.send({ kind: 'catalog', catalog: CATALOG })
  opening.send({
    kind: 'module',
    module: module(0, { 'startup.bml': ['bml', startup] }),
  })
  opening.send({ kind: 'line', line, receiverId })
  opening.send({ kind: 'open' })

  return {
    ...opening,
    registers: (opening.runtime as unknown as { registers: { Ureg: string[] } })
      .registers.Ureg,
  }
}

const ANSWERED = { result: 1, status: 200, body: 'ok' }

const CHECKING = bml(
  '<p id="p" style="nav-index: 0">p</p>',
  '<script>' +
    'browser.Ureg[1] = String(Number(browser.Ureg[1] || "0") + 1);' +
    'var r = browser.transmitTextDataOverIP("http://example.test/check#x", "", "EUC-JP");' +
    'browser.Ureg[0] = r.join(",");' +
    '</script>' +
    '<script>browser.Ureg[2] = "after"</script>',
).replace('<body>', '<body onload="browser.Ureg[3] = \'loaded\'">')

test('a transmission stops the script until its answer is in, then the script runs again from its start with the answer, and the rest of the document after it', () => {
  const { heard, send, registers, forget } = overTheLine(CHECKING, 'on')

  assert.deepEqual(heard(), [
    {
      kind: 'transmit',
      id: 1,
      uri: 'http://example.test/check',
      text: '',
      charset: 'EUC-JP',
    },
  ])
  assert.deepEqual(registers.slice(0, 4), ['', '1', '', ''])

  forget()
  send({ kind: 'transmitted', id: 1, answer: ANSWERED })

  assert.deepEqual(registers.slice(0, 4), ['1,200,ok', '2', 'after', 'loaded'])
  assert.deepEqual(
    heard().map((message) => message.kind),
    ['videoRect', 'usedKeys'],
  )
})

test('an answer nothing waits on, or one for a page no longer shown, runs nothing', () => {
  const { send, registers } = overTheLine(CHECKING, 'on')

  send({ kind: 'transmitted', id: 7, answer: ANSWERED })
  assert.equal(registers[1], '1')

  send({ kind: 'close' })
  send({ kind: 'transmitted', id: 1, answer: ANSWERED })
  assert.equal(registers[1], '1')
  assert.equal(registers[0], '')
})

const TWICE = bml(
  '<p id="p" style="nav-index: 0" onclick="' +
    "browser.setInterval(&quot;browser.Ureg[2] = 'tick'&quot;, 1000, 0);" +
    'var a = browser.transmitTextDataOverIP(&quot;http://example.test/a&quot;, &quot;x=1&quot;, &quot;EUC-JP&quot;);' +
    'var b = browser.transmitTextDataOverIP(&quot;http://example.test/b&quot;, &quot;&quot;, &quot;EUC-JP&quot;);' +
    'browser.Ureg[0] = a[2] + &quot;/&quot; + b[2];' +
    'browser.Ureg[1] = String(Number(browser.Ureg[1] || &quot;0&quot;) + 1);' +
    '">p</p>',
)

test('a handler that transmits twice is answered both in the order it asked, and a timer it started before waiting is not started twice', () => {
  const { heard, send, registers, forget, timers } = overTheLine(TWICE, 'on')

  forget()
  send({ kind: 'key', key: 'enter' })

  assert.deepEqual(heard(), [
    {
      kind: 'transmit',
      id: 1,
      uri: 'http://example.test/a',
      text: 'x=1',
      charset: 'EUC-JP',
    },
  ])

  forget()
  send({
    kind: 'transmitted',
    id: 1,
    answer: { result: 1, status: 200, body: 'first' },
  })

  assert.deepEqual(heard(), [
    {
      kind: 'transmit',
      id: 2,
      uri: 'http://example.test/b',
      text: '',
      charset: 'EUC-JP',
    },
  ])
  assert.equal(registers[0], '')
  assert.equal(timers.pending, 0)

  send({
    kind: 'transmitted',
    id: 2,
    answer: { result: 1, status: 404, body: 'second' },
  })

  assert.equal(registers[0], 'first/second')
  assert.equal(registers[1], '1')
  assert.equal(timers.pending, 1)
})

const GUARDED = bml(
  '<p id="box" style="nav-index: 0" onkeydown="pressed();">box</p>',
  '<script>' +
    'var ready = true;' +
    'var pressedTimes = 0;' +
    'function taken() { if (!ready) { return true; } ready = false; return false; }' +
    'function pressed() {' +
    '  if (taken()) { return; }' +
    '  pressedTimes = pressedTimes + 1;' +
    '  var r = browser.transmitTextDataOverIP("http://example.test/check", "", "EUC-JP");' +
    '  browser.Ureg[0] = r[0] == 1 && r[1] == 200 ? "checked" : "refused";' +
    '  browser.Ureg[1] = String(pressedTimes);' +
    '  browser.setInterval("ready = true;", 100, 1);' +
    '}' +
    '</script>',
)

test('a handler run again after its answer finds the document’s globals as they were when it began, so a guard it set before waiting does not turn the run away', () => {
  const { heard, send, registers, forget, timers } = overTheLine(GUARDED, 'on')

  forget()
  send({ kind: 'key', key: 'enter' })

  assert.equal(heard()[0]?.kind, 'transmit')
  assert.equal(registers[0], '')

  send({ kind: 'transmitted', id: 1, answer: ANSWERED })

  assert.equal(registers[0], 'checked')
  assert.equal(registers[1], '1')

  timers.tick(100)
  forget()
  send({ kind: 'key', key: 'enter' })
  assert.equal(heard()[0]?.kind, 'transmit')
})

const SETTING_OFF = bml(
  '<p id="p">p</p>',
  '<script>' +
    'var r = browser.transmitTextDataOverIP("http://example.test/check", "", "EUC-JP");' +
    'browser.Ureg[0] = String(r);' +
    'browser.Ureg[1] = String(browser.launchDocument("http://example.test/top.bml"));' +
    'browser.Ureg[2] = [browser.getBrowserSupport("ARIB", "APIGroup", "Com.IP"), browser.isIPConnected(), browser.getIRDID(5)].join(",");' +
    '</script>',
)

test('with the setting off nothing goes over the line, the document is answered as before and the player is told the setting is off', () => {
  const { heard, registers } = overTheLine(SETTING_OFF, 'off', B_CAS)

  assert.equal(registers[0], 'NaN')
  assert.equal(registers[1], 'NaN')
  assert.equal(registers[2], '0,NaN,')
  assert.deepEqual(
    heard().filter(
      (message) => message.kind !== 'videoRect' && message.kind !== 'usedKeys',
    ),
    [
      { kind: 'line', said: 'off' },
      { kind: 'line', said: 'off' },
    ],
  )
})

test('where there is no line, as in a recording, a transmission times out and the player is told it is not supported', () => {
  const { heard, registers } = overTheLine(SETTING_OFF, 'none')

  assert.equal(registers[0], '-3,NaN,')
  assert.deepEqual(
    heard().filter((message) => message.kind === 'unsupported'),
    [
      { kind: 'unsupported', what: 'transmitTextDataOverIP' },
      { kind: 'unsupported', what: 'launchDocument' },
    ],
  )
  assert.equal(
    heard().some((message) => message.kind === 'transmit'),
    false,
  )
})

const IDENTIFIED = bml(
  '<p id="p">p</p>',
  '<script>browser.Ureg[0] = [browser.getIRDID(5), browser.getIRDID(13), browser.getIRDID(0xF0001), browser.getBrowserSupport("ARIB", "APIGroup", "Com.IP.Transmit"), browser.getConnectionType()].join(",")</script>',
)

test('the card’s ID the player hands with the line is what the document is told for the card’s CA system, and the line is there', () => {
  assert.equal(
    overTheLine(IDENTIFIED, 'on', B_CAS).registers[0],
    'a1b2c3d4e5f6,,,1,403',
  )
  assert.equal(
    overTheLine(IDENTIFIED, 'on', { caSystemId: 13, cardId: 'a1b2c3d4e5f6' })
      .registers[0],
    ',a1b2c3d4e5f6,,1,403',
  )
  assert.equal(overTheLine(IDENTIFIED, 'on').registers[0], ',,,1,403')
})

const TO_THE_LINE = bml(
  '<p id="go" style="nav-index: 0" onclick="browser.launchDocument(&quot;http://example.test/bml/top.bml&quot;)">go</p>',
)

const TOP = bml(
  '<p id="top" style="nav-index: 0">top</p><a id="next" href="next.bml" style="nav-index: 1">next</a>',
  '<script src="lib/s.js"></script>',
)

const SCRIPT =
  'browser.Ureg[0] = [browser.isBeingBroadcast("HTTPServer"), browser.getBrowserStatus("TerrP", "IRDState", "Link"), browser.getActiveDocument()].join(",")'

function fetchedModule(resources: Record<string, [ResourceKind, string]>) {
  return module(0, resources, 0, 0)
}

test('a document over the line is fetched through the player, with the scripts it names read against its URL, and is told it came by the line', () => {
  const { heard, send, registers, forget, element } = overTheLine(
    TO_THE_LINE,
    'on',
  )

  forget()
  send({ kind: 'key', key: 'enter' })

  assert.deepEqual(heard(), [
    { kind: 'fetch', id: 1, uri: 'http://example.test/bml/top.bml' },
    { kind: 'waiting', waiting: true },
  ])

  forget()
  send({
    kind: 'fetched',
    id: 1,
    module: fetchedModule({ 'top.bml': ['bml', TOP] }),
  })

  assert.deepEqual(heard(), [
    { kind: 'fetch', id: 2, uri: 'http://example.test/bml/lib/s.js' },
  ])
  assert.ok(element('go'))

  forget()
  send({
    kind: 'fetched',
    id: 2,
    module: fetchedModule({ 's.js': ['script', SCRIPT] }),
  })

  assert.equal(element('go'), null)
  assert.ok(element('top'))
  assert.equal(registers[0], '1,1,http://example.test/bml/top.bml')
  assert.deepEqual(heard()[0], { kind: 'waiting', waiting: false })
})

test('a document over the line that could not be fetched leaves the page as it was', () => {
  const { heard, send, forget, element } = overTheLine(TO_THE_LINE, 'on')

  send({ kind: 'key', key: 'enter' })
  forget()
  send({ kind: 'fetched', id: 1, module: null })

  assert.deepEqual(heard(), [{ kind: 'waiting', waiting: false }])
  assert.ok(element('go'))
})

test('with the setting off a document over the line is not fetched', () => {
  const { heard, send, forget, element } = overTheLine(TO_THE_LINE, 'off')

  forget()
  send({ kind: 'key', key: 'enter' })

  assert.deepEqual(heard(), [{ kind: 'line', said: 'off' }])
  assert.ok(element('go'))
})

test('the bundled face is loaded with its line box as tall as its em square', (t) => {
  const made: { family: string; descriptors?: FontFaceDescriptors }[] = []

  class RecordingFontFace {
    constructor(
      family: string,
      _source: ArrayBuffer,
      descriptors?: FontFaceDescriptors,
    ) {
      made.push({ family, descriptors })
    }

    load(): Promise<this> {
      return Promise.resolve(this)
    }
  }

  const held = Object.getOwnPropertyDescriptor(globalThis, 'FontFace')

  t.after(() => {
    if (held) {
      Object.defineProperty(globalThis, 'FontFace', held)
    } else {
      Reflect.deleteProperty(globalThis, 'FontFace')
    }
  })
  Object.defineProperty(globalThis, 'FontFace', {
    configurable: true,
    writable: true,
    value: RecordingFontFace,
  })
  const { send } = frame()

  send({
    kind: 'font',
    fonts: [{ family: 'Denpa Font', bytes: new ArrayBuffer(8) }],
  })

  assert.deepEqual(made, [
    {
      family: 'Denpa Font',
      descriptors: {
        ascentOverride: '86.04%',
        descentOverride: '13.96%',
        lineGapOverride: '0%',
      },
    },
  ])
})

const AIT = 'http://hc.example.test/p/a.ait'

const APP_ENTRY = 'http://hc.example.test/p/index.html'

const STARTS_BY_ITSELF = {
  orgId: 16,
  appId: 1,
  controlCode: 1,
  entryUrl: APP_ENTRY,
}

/** A document opened with Hybridcast allowed, the starts the player says failed, and the shared registers it was handed, if any. */
function withHybridcast(
  startup: string,
  {
    allowed = true,
    failed = [],
    greg,
  }: {
    allowed?: boolean
    failed?: { ait: string; orgId: number; appId: number }[]
    greg?: string[]
  } = {},
) {
  const opening = frame()

  opening.send({ kind: 'catalog', catalog: CATALOG })
  opening.send({
    kind: 'module',
    module: module(0, { 'startup.bml': ['bml', startup] }),
  })
  opening.send({ kind: 'line', line: 'on', receiverId: null })
  opening.send({ kind: 'hybridcast', allowed, failed })

  if (greg) {
    opening.send({ kind: 'greg', greg })
  }

  opening.send({ kind: 'open' })

  const registers = (
    opening.runtime as unknown as {
      registers: { Ureg: string[]; Greg: string[] }
    }
  ).registers

  return { ...opening, Ureg: registers.Ureg, Greg: registers.Greg }
}

const CHECKED_THEN_STARTED = bml(
  '<p id="box" style="nav-index: 0" onkeydown="pressed();">box</p>',
  '<script>' +
    'var ready = true;' +
    'function taken() { if (!ready) { return true; } ready = false; return false; }' +
    'function pressed() {' +
    '  if (taken()) { return; }' +
    '  var r = browser.transmitTextDataOverIP("http://example.test/check", "", "EUC-JP");' +
    '  if (r[0] != 1 || r[1] != 200) { return; }' +
    '  browser.Greg[44] = "back";' +
    '  browser.startAITControlledApp("10", "1", "' +
    AIT +
    '");' +
    '}' +
    '</script>',
)

test('a key that checks the line and then starts an application gets there, through both waits, with a guard against a second press set before the first', () => {
  const { heard, send, forget } = withHybridcast(CHECKED_THEN_STARTED)

  forget()
  send({ kind: 'key', key: 'enter' })
  assert.deepEqual(
    heard().map((message) => message.kind),
    ['transmit'],
  )

  forget()
  send({ kind: 'transmitted', id: 1, answer: ANSWERED })
  assert.deepEqual(heard(), [{ kind: 'ait', id: 2, uri: AIT }])

  forget()
  send({ kind: 'aitRead', id: 2, applications: [STARTS_BY_ITSELF] })

  const started = heard().find((message) => message.kind === 'startApp')

  assert.deepEqual(
    started?.kind === 'startApp' ? [started.start, started.greg[44]] : null,
    [{ ait: AIT, orgId: 16, appId: 1 }, 'back'],
  )
})

const RECEIVING = bml(
  '<p id="p" style="nav-index: 0" onclick="' +
    'var r = browser.getReceivedAIT(&quot;' +
    AIT +
    '&quot;);' +
    'browser.Ureg[1] = typeof r === &quot;number&quot; ? String(r) : r[1].join(&quot;,&quot;);' +
    '">p</p>',
  '<script>browser.Ureg[0] = String(browser.startReceivingAIT("' +
    AIT +
    '"))</script>',
)

test('an AIT asked to be received is read through the player while the script goes on, answered 0 until it is in, and forgotten when the document changes', () => {
  const { heard, send, Ureg, forget } = withHybridcast(RECEIVING)

  assert.equal(Ureg[0], '1')
  assert.deepEqual(
    heard().filter((message) => message.kind === 'ait'),
    [{ kind: 'ait', id: 1, uri: AIT }],
  )

  send({ kind: 'key', key: 'enter' })
  assert.equal(Ureg[1], '0')

  send({ kind: 'aitRead', id: 1, applications: [STARTS_BY_ITSELF] })
  send({ kind: 'key', key: 'enter' })
  assert.equal(Ureg[1], `10,1,1,${APP_ENTRY}`)

  forget()
  send({ kind: 'close' })
  send({ kind: 'open' })
  send({ kind: 'key', key: 'enter' })
  assert.equal(Ureg[1], '0')
})

test('an AIT that could not be read is answered -1', () => {
  const { send, Ureg } = withHybridcast(RECEIVING)

  send({ kind: 'aitRead', id: 1, applications: null })
  send({ kind: 'key', key: 'enter' })
  assert.equal(Ureg[1], '-1')
})

const STARTING = bml(
  '<p id="p" style="nav-index: 0">p</p>',
  '<script>' +
    'browser.Greg[44] = "nhk:back";' +
    'browser.Ureg[1] = String(Number(browser.Ureg[1] || "0") + 1);' +
    'browser.Ureg[0] = String(browser.startAITControlledApp("10", "1", "' +
    AIT +
    '"));' +
    'browser.Ureg[2] = "after";' +
    '</script>',
)

test('starting an application waits on the AIT read again, then closes the documents and asks the player to start it with the shared registers, and the script goes no further', () => {
  const { heard, send, Ureg, plane, forget } = withHybridcast(STARTING)

  assert.deepEqual(
    heard().filter((message) => message.kind === 'ait'),
    [{ kind: 'ait', id: 1, uri: AIT }],
  )

  forget()
  send({ kind: 'aitRead', id: 1, applications: [STARTS_BY_ITSELF] })

  const started = heard().find((message) => message.kind === 'startApp')

  assert.deepEqual(
    started && started.kind === 'startApp' ? started.start : null,
    { ait: AIT, orgId: 16, appId: 1 },
  )
  assert.equal(
    started && started.kind === 'startApp' ? started.greg[44] : null,
    'nhk:back',
  )
  assert.equal(
    started && started.kind === 'startApp' ? started.greg.length : 0,
    64,
  )
  assert.deepEqual(Ureg.slice(0, 3), ['', '2', ''])
  assert.equal(plane.childNodes.length, 0)
})

test('an application the AIT does not name to start by itself fails, the player is told it did not open, and the script goes on', () => {
  const { heard, send, Ureg, forget } = withHybridcast(STARTING)

  forget()
  send({
    kind: 'aitRead',
    id: 1,
    applications: [{ ...STARTS_BY_ITSELF, controlCode: 2 }],
  })

  assert.deepEqual(Ureg.slice(0, 3), ['NaN', '2', 'after'])
  assert.deepEqual(
    heard().filter(
      (message) => message.kind === 'unopened' || message.kind === 'startApp',
    ),
    [{ kind: 'unopened' }],
  )
})

test('an application that failed to start while the broadcast was open is not asked for again', () => {
  const { heard, Ureg } = withHybridcast(STARTING, {
    failed: [{ ait: AIT, orgId: 16, appId: 1 }],
  })

  assert.deepEqual(Ureg.slice(0, 3), ['NaN', '1', 'after'])
  assert.equal(
    heard().some((message) => message.kind === 'ait'),
    false,
  )
  assert.equal(
    heard().some((message) => message.kind === 'unopened'),
    true,
  )
})

test('while Hybridcast is not allowed, starting an application is not supported and nothing is read', () => {
  const { heard, Ureg } = withHybridcast(STARTING, { allowed: false })

  assert.deepEqual(Ureg.slice(0, 3), ['NaN', '1', 'after'])
  assert.deepEqual(
    heard().filter(
      (message) =>
        message.kind === 'ait' ||
        message.kind === 'unopened' ||
        message.kind === 'unsupported',
    ),
    [{ kind: 'unsupported', what: 'startAITControlledApp' }],
  )
})

const COMING_BACK = bml(
  '<p id="p" style="nav-index: 0">p</p>',
  '<script>browser.Ureg[0] = browser.Greg[61] + "/" + browser.Greg[0]</script>',
)

test('the shared registers handed back as the documents open again are what the documents read', () => {
  const greg = Array.from({ length: 64 }, () => '')

  greg[61] = 'nhk:1'

  const { Ureg, Greg } = withHybridcast(COMING_BACK, { greg })

  assert.equal(Ureg[0], 'nhk:1/')
  assert.equal(Greg.length, 64)
})

const LEAVING_ODD_REGISTERS = bml(
  '<p id="p" style="nav-index: 0">p</p>',
  '<script>' +
    'browser.Greg[3] = new Array(2001).join("x");' +
    'browser.Greg[4] = 7;' +
    'browser.Greg[5] = null;' +
    'browser.startAITControlledApp("10", "1", "' +
    AIT +
    '");' +
    '</script>',
)

test('the shared registers are handed over as strings no longer than the most a register carries, whatever a document left in them, so that the player takes the start', () => {
  const { heard, send, forget } = withHybridcast(LEAVING_ODD_REGISTERS)

  forget()
  send({ kind: 'aitRead', id: 1, applications: [STARTS_BY_ITSELF] })

  const started = heard().find((message) => message.kind === 'startApp')
  const greg = started && started.kind === 'startApp' ? started.greg : []

  assert.equal(greg.length, 64)
  assert.equal(greg[3].length, MOST_REGISTER)
  assert.equal(greg[4], '7')
  assert.equal(greg[5], '')
  assert.deepEqual(
    runtimeMessageFrom(
      { origin: RUNTIME_ORIGIN, source: 'frame', data: started },
      'frame',
    ),
    started,
  )
})

test('a start the player would not take leaves the documents as they are and is said not to open', () => {
  const runtime = withHybridcast(STARTING)
  const leave = (
    runtime.runtime as unknown as {
      startApplication(start: {
        ait: string
        orgId: number
        appId: number
      }): void
    }
  ).startApplication.bind(runtime.runtime)

  runtime.forget()
  leave({ ait: AIT, orgId: 16, appId: 0x10000 })

  assert.deepEqual(runtime.heard(), [{ kind: 'unopened' }])
  assert.notEqual(runtime.plane.childNodes.length, 0)
})

const LAMP = mng(
  mhdr(40, 30, 100),
  term(3, 0, 0, FOREVER),
  fram({ mode: 1, delay: 10, lasting: true }),
  picture(40, 30),
  picture(40, 30),
  MEND,
)

const BROKEN = mng(mhdr(40, 30, 100), picture(40, 30), MEND)

BROKEN[BROKEN.length - 14] ^= 0xff

const STILL = mng(
  mhdr(20, 20, 100),
  chunk('tEXt', Buffer.from('a\0b')),
  picture(20, 20),
  MEND,
)

/** A frame whose pictures decode into named fakes, with the document and its MNGs handed to it and opened. */
function withMng(startup: string) {
  const bitmaps: FakeBitmap[] = []
  const opening = frame({
    decode: async () => {
      bitmaps.push(new FakeBitmap(`#${bitmaps.length}`))

      return bitmaps[bitmaps.length - 1]
    },
  })

  opening.send({ kind: 'catalog', catalog: CATALOG })
  opening.send({
    kind: 'module',
    module: {
      tag: 0x40,
      id: 0,
      version: 1,
      resources: [
        { path: 'startup.bml', kind: 'bml', body: text(startup) },
        { path: 'lamp.mng', kind: 'binary', body: LAMP },
        { path: 'still.mng', kind: 'binary', body: STILL },
        { path: 'broken.mng', kind: 'binary', body: BROKEN },
      ],
    },
  })
  opening.send({
    kind: 'module',
    module: module(1, { 'next.bml': ['bml', NEXT] }),
  })
  opening.send({ kind: 'open' })

  return { ...opening, bitmaps }
}

const decoded = () => new Promise((resolve) => setImmediate(resolve))

test('an MNG in the document plays on a canvas in its place, and leaving the document stops it and lets its pictures go', async () => {
  const { element, timers, bitmaps, send, warnings } = withMng(
    bml(
      '<object id="lamp" type="image/X-arib-mng" data="lamp.mng" style="left: 10px; top: 10px; width: 40px; height: 30px"/>' +
        '<a id="next" href="~/0001/next.bml" style="nav-index: 0">next</a>',
    ),
  )

  await decoded()

  const canvas = element('lamp') as FakeCanvas

  assert.equal(canvas.tagName, 'CANVAS')
  assert.equal(canvas.getAttribute('data-bml-tag'), 'object')
  assert.equal(canvas.width, 40)
  assert.deepEqual(canvas.surface.drawn, [
    'clear 0,0,40,30',
    '#0 at 0,0 in 0,0,40,30',
  ])

  timers.tick(100)

  assert.equal(canvas.surface.drawn.at(-1), '#1 at 0,0 in 0,0,40,30')
  assert.equal(
    bitmaps.some((bitmap) => bitmap.closed),
    false,
  )

  send({ kind: 'key', key: 'enter' })
  timers.tick(100)

  assert.equal(element('lamp'), null)
  assert.equal(canvas.surface.drawn.length, 3)
  assert.equal(
    bitmaps.every((bitmap) => bitmap.closed),
    true,
  )
  assert.deepEqual(warnings, [])
})

test('a script that gives the canvas another MNG plays that one in place of the first, which lets its pictures go', async () => {
  const { element, bitmaps, send, warnings } = withMng(
    bml(
      '<object id="lamp" type="image/X-arib-mng" data="lamp.mng"/>' +
        '<p id="swap" onclick="swap()" style="nav-index: 0">swap</p>',
      '<script>function swap() { document.getElementById("lamp").data = "still.mng" }</script>',
    ),
  )

  await decoded()
  send({ kind: 'key', key: 'enter' })
  await decoded()

  const canvas = element('lamp') as FakeCanvas

  assert.equal(canvas.width, 20)
  assert.equal(canvas.surface.drawn.at(-1), '#2 at 0,0 in 0,0,20,20')
  assert.deepEqual(
    bitmaps.map((bitmap) => bitmap.closed),
    [true, true, false],
  )
  assert.deepEqual(warnings, ['data broadcast: unsupported MNG chunk: tEXt'])
})

test('a page holds no more decoded MNG pixels than it may, each canvas counted at the size of its frame', async () => {
  const wide = mng(mhdr(1920, 1080, 100), picture(1, 1), MEND)
  const objects = Array.from(
    { length: 9 },
    (_, at) => `<object id="w${at}" type="image/X-arib-mng" data="wide.mng"/>`,
  ).join('')
  const opening = frame({ decode: async () => new FakeBitmap('wide') })

  opening.send({ kind: 'catalog', catalog: CATALOG })
  opening.send({
    kind: 'module',
    module: {
      tag: 0x40,
      id: 0,
      version: 1,
      resources: [
        { path: 'startup.bml', kind: 'bml', body: text(bml(objects)) },
        { path: 'wide.mng', kind: 'binary', body: wide },
      ],
    },
  })
  opening.send({ kind: 'open' })
  await decoded()

  const widths = Array.from(
    { length: 9 },
    (_, at) => (opening.element(`w${at}`) as FakeCanvas).width,
  )

  assert.deepEqual(widths, [...new Array<number>(8).fill(1920), 300])
  assert.deepEqual(opening.warnings, [
    'data broadcast: too many MNG pixels on the page',
  ])
})

test('a script that gives the canvas what is not an MNG, a malformed one or nothing at all is a warning, and the MNG plays on', async () => {
  const { element, bitmaps, send, warnings } = withMng(
    bml(
      '<object id="lamp" type="image/X-arib-mng" data="lamp.mng"/>' +
        '<p id="swap" onclick="swap()" style="nav-index: 0">swap</p>',
      '<script>function swap() { var lamp = document.getElementById("lamp"); lamp.data = "startup.bml"; lamp.data = "broken.mng"; lamp.data = "none.mng" }</script>',
    ),
  )

  await decoded()
  send({ kind: 'key', key: 'enter' })
  await decoded()

  assert.equal((element('lamp') as FakeCanvas).width, 40)
  assert.equal(
    bitmaps.some((bitmap) => bitmap.closed),
    false,
  )
  assert.deepEqual(warnings, [
    'data broadcast: unsupported image: startup.bml',
    'data broadcast: malformed MNG: broken.mng (a CRC that does not match in IEND)',
    'data broadcast: missing image: none.mng',
  ])
})
