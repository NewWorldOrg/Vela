import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

import { BmlRuntime } from '@/components/data-broadcast/bml-runtime'
import type { BmlCatalog } from '@/lib/bml/catalog'
import type { PlayerMessage, RuntimeMessage } from '@/lib/bml/messages'
import type { BmlModule, ResourceKind } from '@/lib/bml/resources'
import {
  fakeFrame,
  vmEvaluator,
  type FakeElement,
} from '@/tests/components/data-broadcast/frame-fakes'

const VELA = 'https://vela.example'

function frame(options: { drawFails?: boolean } = {}) {
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

test('an entry document that never shows anything is given the data button a few times, then left', () => {
  const { runtime, timers } = opened(NEVER_READY)
  const registers = (runtime as unknown as { registers: { Ureg: string[] } })
    .registers.Ureg

  for (let round = 0; round < 10; round += 1) {
    timers.tick(500)
  }

  assert.equal(registers[0], 'dddddd')
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
