import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  IGNORED_FUNCTIONS,
  LINE_FUNCTIONS,
  MAKER_ID,
  REFUSED_FUNCTIONS,
  UNCONNECTED_QUERIES,
  SUPPORTED_FUNCTIONS,
  browserOf,
  registersOf,
  type BrowserHost,
} from '@/lib/bml/browser'
import { CONTROL_CODE, type AitApplication } from '@/lib/bml/ait'
import { answerOf, type LineState } from '@/lib/bml/line'
import { PersistentMemory } from '@/lib/bml/memory'
import { DocumentLeft, LineAwaited } from '@/lib/bml/scripts'

type Browser = Record<string, (...args: unknown[]) => unknown> & {
  Ureg: string[]
  Greg: string[]
}

const LISTED: Record<string, boolean> = { '/40/0001': true, '/40/0009': false }

function host(over: Partial<BrowserHost> = {}) {
  const calls: string[] = []
  const unsupported: string[] = []
  const warnings: string[] = []
  const lineOff: string[] = []
  const sent: string[][] = []
  const made: BrowserHost = {
    launch: (reference) => {
      calls.push(`launch ${String(reference)}`)

      return reference !== 'nowhere'
    },
    reload: () => calls.push('reload'),
    activeDocument: () => '/40/0000/startup.bml',
    relativeTime: () => 12,
    npt: () => null,
    programme: () => ({
      service: 1024,
      event: 7,
      network: 32736,
      stream: 3,
      startsAt: 1_700_000_000,
    }),
    hasComponent: (tag) => tag === 0x40,
    listed: (reference) => LISTED[String(reference)] ?? null,
    quit: () => calls.push('quit'),
    memory: new PersistentMemory(),
    registers: { Ureg: registersOf(), Greg: registersOf() },
    startTimer: (code, everyMs, times) => {
      calls.push(`timer ${String(code)} ${String(everyMs)} ${String(times)}`)

      return 5
    },
    stopTimer: (id) => id === 5,
    sleep: (ms) => calls.push(`sleep ${String(ms)}`),
    lock: (reference) =>
      reference === 'nowhere'
        ? 'bad'
        : reference === '/70/0001'
          ? 'noComponent'
          : 'held',
    unlock: (reference) => calls.push(`unlock ${String(reference)}`),
    lockedModules: () => [
      { path: '/40/0001', held: true },
      { path: '/40/0002', held: false },
    ],
    unsupported: (what) => unsupported.push(what),
    warn: (what) => warnings.push(what),
    line: () => 'none',
    receiverId: () => null,
    overTheLine: () => false,
    transmit: (uri, text, charset) => {
      sent.push([uri, text, charset])

      return answerOf(1, 200, 'ok')
    },
    lineOff: (what) => lineOff.push(what),
    hybridcast: () => false,
    receiveAit: (uri) => {
      calls.push(`receive ${uri}`)

      return uri !== 'http://hc.example.test/too-many.ait'
    },
    receivedAit: () => undefined,
    readAit: () => null,
    startApplication: (start) =>
      calls.push(`start ${start.ait} ${start.orgId} ${start.appId}`),
    unopened: () => calls.push('unopened'),
    failedBefore: () => false,
    ...over,
  }

  return {
    browser: browserOf(made) as Browser,
    calls,
    unsupported,
    warnings,
    lineOff,
    sent,
  }
}

test('launching a document throws out of the script once the host took the reference, and fails when it did not', () => {
  const { browser, calls } = host()

  assert.throws(() => browser.launchDocument('next.bml', 'cut'), DocumentLeft)
  assert.ok(Number.isNaN(browser.launchDocument('nowhere')))
  assert.throws(() => browser.reloadActiveDocument(), DocumentLeft)
  assert.deepEqual(calls, ['launch next.bml', 'launch nowhere', 'reload'])
  assert.equal(browser.getActiveDocument(), '/40/0000/startup.bml')
})

test('quitting the document throws out of the script once the host was told', () => {
  const { browser, calls } = host()

  assert.throws(() => browser.quitDocument(), DocumentLeft)
  assert.deepEqual(calls, ['quit'])
})

test('whether a module is being broadcast is 1 or 0 by the catalog, and fails for a reference that names no module', () => {
  const { browser } = host()

  assert.equal(browser.isBeingBroadcast('/40/0001'), 1)
  assert.equal(browser.isBeingBroadcast('/40/0009'), 0)
  assert.ok(Number.isNaN(browser.isBeingBroadcast(3)))
})

test('the PPP connection is refused like the rest of the communication', () => {
  const { browser, unsupported } = host()

  assert.ok(Number.isNaN(browser.connectPPP('isp', 'user', 'pass')))
  assert.ok(Number.isNaN(browser.disconnectPPP()))
  assert.deepEqual(unsupported, ['connectPPP', 'disconnectPPP'])
})

test('a page that asks after the line as it loads is answered as a receiver without one, and the player is told nothing, as the viewer has asked for nothing', () => {
  const { browser, unsupported, warnings } = host()

  assert.equal(browser.isIPConnected() !== 1, true)
  assert.ok(Number.isNaN(browser.getConnectionType()))
  assert.ok(!browser.getISPParams())

  for (const name of UNCONNECTED_QUERIES) {
    assert.ok(Number.isNaN(browser[name]()), name)
  }

  assert.deepEqual(unsupported, [])
  assert.deepEqual(warnings.slice(0, 3), [
    'not connected: isIPConnected',
    'not connected: getConnectionType',
    'not connected: getISPParams',
  ])
  assert.equal(
    UNCONNECTED_QUERIES.some((name) =>
      (REFUSED_FUNCTIONS as readonly string[]).includes(name),
    ),
    false,
  )
  assert.ok(
    (LINE_FUNCTIONS as readonly string[]).includes('transmitTextDataOverIP'),
  )
})

test('the version, the support of a group and the tuning are answered', () => {
  const { browser } = host()

  assert.deepEqual(browser.getBrowserVersion(), ['Vela', '1', '0', '0'])
  assert.equal(browser.getBrowserSupport('ARIB', 'APIGroup', 'Ctrl.Basic'), 1)
  assert.equal(browser.getBrowserSupport('ARIB', 'APIGroup', 'Com.IP'), 0)
  assert.equal(browser.getBrowserSupport('ARIB', 'APIGroup'), 0)
  assert.equal(browser.getBrowserSupport('ARIB', 'BMLversion'), 1)
  assert.equal(browser.getBrowserSupport('ARIB', 'BMLversion', '3.0'), 1)
  assert.equal(browser.getBrowserSupport('ARIB', 'BMLversion', '4.0'), 0)
  assert.equal(browser.getBrowserSupport('ARIB', 'Ctrl.Basic'), 0)
  assert.equal(browser.getBrowserSupport('other', 'APIGroup', 'Ctrl.Basic'), 0)
  assert.equal(browser.getTuningStatus(), 1)
  assert.equal(browser.detectComponent('/40'), 1)
  assert.equal(browser.detectComponent('/50/0000/startup.bml'), 0)
  assert.ok(Number.isNaN(browser.detectComponent('x')))
  assert.equal(browser.isSupportedMedia('4'), 0)
  assert.equal(browser.getIRDID(5), null)
})

test('the time and the programme are answered from the host, and are NaN or null when it has none', () => {
  const { browser } = host()

  assert.equal(browser.getProgramRelativeTime(), 12)
  assert.ok(Number.isNaN(browser.getNPT()))
  assert.equal(browser.getProgramID(1), '0x0007')
  assert.equal(browser.getProgramID(2), '0x0400')
  assert.equal(browser.getProgramID(3), '0x7fe0')
  assert.equal(browser.getProgramID(4), '0x0003')
  assert.equal(browser.getProgramID(5), null)
  assert.equal(
    (browser.epgGetEventStartTime() as Date).getTime(),
    1_700_000_000_000,
  )

  const bare = host({
    programme: () => null,
    relativeTime: () => null,
  }).browser

  assert.ok(Number.isNaN(bare.getProgramRelativeTime()))
  assert.equal(bare.getProgramID(2), null)
  assert.equal(bare.epgGetEventStartTime(), null)
})

test('a date is moved by a count of seconds, minutes, hours, days or weeks, and two dates are told apart in those, in milliseconds otherwise', () => {
  const { browser } = host()
  const from = new Date(2026, 0, 1, 0, 0, 0)
  const later = browser.addDate(from, 90, 2) as Date

  assert.equal(later.getTime() - from.getTime(), 90 * 60_000)
  assert.equal(browser.subDate(later, from, 1), 5400)
  assert.equal(browser.subDate(later, from, 2), 90)
  assert.equal(browser.subDate(later, from, 3), 1)
  assert.equal(browser.subDate(from, later, 3), -1)
  assert.equal(browser.subDate(later, from, 4), 0)
  assert.equal(browser.subDate(from, browser.addDate(from, 2, 5), 4), -14)
  assert.equal(browser.subDate(later, from, 0), 5_400_000)
  assert.equal(browser.subDate(later, from), 5_400_000)
  assert.ok(Number.isNaN(browser.subDate('x', from, 1)))
  assert.ok(Number.isNaN(browser.subDate(from, null, 1)))
  assert.ok(Number.isNaN(browser.addDate(from, 'x', 1)))
  assert.ok(Number.isNaN(browser.addDate(new Date(Number.NaN), 1, 1)))
})

test('timers, sleep and the module locks go to the host', () => {
  const { browser, calls } = host()

  assert.equal(browser.setInterval('tick()', 500, 3), 5)
  assert.equal(browser.clearTimer(5), 1)
  assert.ok(Number.isNaN(browser.clearTimer(6)))
  assert.equal(browser.sleep(100), 1)
  assert.equal(browser.lockModuleOnMemory('~/0001'), 1)
  assert.ok(Number.isNaN(browser.lockModuleOnMemoryEx('nowhere')))
  assert.equal(browser.lockModuleOnMemoryEx('/70/0001'), -3)
  assert.equal(browser.unlockModuleOnMemory('~/0001'), 1)
  assert.equal(browser.unlockAllModulesOnMemory(), 1)
  assert.deepEqual(browser.getLockedModuleInfo(), [
    ['/40/0001', 2, 1],
    ['/40/0002', 2, 2],
  ])
  assert.deepEqual(calls, [
    'timer tick() 500 3',
    'sleep 100',
    'unlock ~/0001',
    'unlock null',
  ])
})

test('the persistent memory is read and written through the host’s copy', () => {
  const { browser } = host()

  assert.deepEqual(browser.readPersistentArray('visits', 'U:1B'), [0])
  assert.equal(browser.writePersistentArray('visits', 'U:1B', [3]), 1)
  assert.deepEqual(browser.readPersistentArray('visits', 'U:1B'), [3])
  assert.deepEqual(browser.readPersistentArray('visits', 'U:2B'), [768])
  assert.equal(browser.readPersistentArray('visits', 'U:8B'), null)
  assert.ok(Number.isNaN(browser.writePersistentArray('visits', 'U:1B', ['x'])))
})

test('random answers within the count asked, from one', () => {
  const { browser } = host()
  const drawn = new Set(
    Array.from({ length: 200 }, () => browser.random(3) as number),
  )

  assert.deepEqual([...drawn].sort(), [1, 2, 3])
  assert.equal(browser.random(0), 1)
})

test('a function that is ignored succeeds, one that communicates fails and is told, and one unknown fails with a warning', () => {
  const { browser, unsupported, warnings } = host()

  for (const name of IGNORED_FUNCTIONS) {
    assert.equal(browser[name](), 1, name)
  }

  for (const name of REFUSED_FUNCTIONS) {
    assert.ok(Number.isNaN(browser[name]()), name)
  }

  assert.deepEqual(unsupported, [...REFUSED_FUNCTIONS])
  assert.ok(Number.isNaN(browser.noSuchFunction(1)))
  assert.deepEqual(warnings, ['unsupported browser function: noSuchFunction'])
  assert.equal('noSuchFunction' in browser, false)
  assert.equal('launchDocument' in browser, true)
})

test('every supported function is there, and the registers are the host’s', () => {
  const { browser } = host()

  for (const name of SUPPORTED_FUNCTIONS) {
    assert.equal(typeof browser[name], 'function', name)
  }

  assert.equal(browser.Ureg.length, 64)
  assert.equal(browser.Greg.length, 64)
  browser.Ureg[0] = 'kept'
  assert.equal(browser.Ureg[0], 'kept')
  ;(browser as Record<string, unknown>).Ureg = 'replaced'
  assert.equal(browser.Ureg[0], 'kept')
})

function lined(line: LineState, over: Partial<BrowserHost> = {}) {
  return host({
    line: () => line,
    receiverId: () => ({ caSystemId: 5, cardId: 'a1b2c3d4e5f6' }),
    ...over,
  })
}

const LINE_GROUPS = ['Com.IP', 'Com.IP.Transmit', 'Com.IP.GetType']

test('the line is supported, connected over Ethernet with DHCP, only while it is used', () => {
  const on = lined('on')

  for (const group of LINE_GROUPS) {
    assert.equal(
      on.browser.getBrowserSupport('ARIB', 'APIGroup', group),
      1,
      group,
    )
  }

  assert.equal(
    on.browser.getBrowserSupport('ARIB', 'APIGroup', 'Com.IP.Connect'),
    0,
  )
  assert.equal(
    on.browser.getBrowserSupport('ARIB', 'APIGroup', 'Com.IP.Params'),
    0,
  )
  assert.equal(on.browser.isIPConnected(), 1)
  assert.equal(on.browser.getConnectionType(), 403)
  assert.equal(on.browser.disconnectPPP(), 1)
  assert.deepEqual(on.unsupported, [])
  assert.deepEqual(on.lineOff, [])

  for (const state of ['off', 'none'] as const) {
    const { browser } = lined(state)

    for (const group of LINE_GROUPS) {
      assert.equal(
        browser.getBrowserSupport('ARIB', 'APIGroup', group),
        0,
        `${state} ${group}`,
      )
    }

    assert.ok(Number.isNaN(browser.isIPConnected()), state)
    assert.ok(Number.isNaN(browser.getConnectionType()), state)
  }
})

test('the card’s ID is answered for the type that names its CA system only while the line is used and the viewer hands it over', () => {
  const on = lined('on').browser

  assert.equal(on.getIRDID(5), 'a1b2c3d4e5f6')
  assert.equal(on.getIRDID('5'), 'a1b2c3d4e5f6')
  assert.equal(on.getIRDID(13), null)
  assert.equal(on.getIRDID(0xf0001), null)
  assert.equal(on.getIRDID('0xE0001'), null)
  assert.equal(on.getIRDID(), null)
  assert.equal(
    lined('on', { receiverId: () => null }).browser.getIRDID(5),
    null,
  )
  assert.equal(lined('off').browser.getIRDID(5), null)
  assert.equal(lined('none').browser.getIRDID(5), null)

  const another = lined('on', {
    receiverId: () => ({ caSystemId: 13, cardId: '0a0b0c0d0e0f' }),
  }).browser

  assert.equal(another.getIRDID(13), '0a0b0c0d0e0f')
  assert.equal(another.getIRDID('0x000D'), '0a0b0c0d0e0f')
  assert.equal(another.getIRDID(5), null)
})

test('a transmission while the line is used goes to the host and is answered as the result, the HTTP status and the body', () => {
  const { browser, sent } = lined('on')

  assert.deepEqual(
    browser.transmitTextDataOverIP('http://example.test/a#b', '', 'EUC-JP'),
    [1, 200, 'ok'],
  )
  assert.deepEqual(
    browser.transmitTextDataOverIP('https://example.test/b', null, 'EUC-JP'),
    [1, 200, 'ok'],
  )
  assert.deepEqual(sent, [
    ['http://example.test/a', '', 'EUC-JP'],
    ['https://example.test/b', '', 'EUC-JP'],
  ])
})

test('a transmission to somewhere the line does not go, or too long, is a bad argument and is not sent', () => {
  const { browser, sent } = lined('on')
  const bad = (answer: unknown) =>
    Array.isArray(answer) && answer[0] === -1 && answer[2] === ''

  assert.ok(
    bad(browser.transmitTextDataOverIP('ftp://example.test/', '', 'EUC-JP')),
  )
  assert.ok(bad(browser.transmitTextDataOverIP('/40/0000/a', '', 'EUC-JP')))
  assert.ok(bad(browser.transmitTextDataOverIP(3, '', 'EUC-JP')))
  assert.ok(
    bad(
      browser.transmitTextDataOverIP(
        'http://example.test/',
        'x'.repeat(16 * 1024 + 1),
        'EUC-JP',
      ),
    ),
  )
  assert.ok(bad(browser.transmitTextDataOverIP('http://example.test/', '', 3)))
  assert.deepEqual(sent, [])
})

test('a transmission whose answer is awaited stops the script', () => {
  const { browser } = lined('on', {
    transmit: () => {
      throw new LineAwaited()
    },
  })

  assert.throws(
    () => browser.transmitTextDataOverIP('http://example.test/', '', 'EUC-JP'),
    LineAwaited,
  )
})

test('with the setting off, what uses the line fails as before and the player is told the setting is off, not that it is unsupported', () => {
  const { browser, sent, lineOff, unsupported } = lined('off')

  assert.ok(
    Number.isNaN(
      browser.transmitTextDataOverIP('http://example.test/', '', 'EUC-JP'),
    ),
  )
  assert.ok(Number.isNaN(browser.disconnectPPP()))
  assert.deepEqual(lineOff, ['transmitTextDataOverIP', 'disconnectPPP'])
  assert.deepEqual(unsupported, [])
  assert.deepEqual(sent, [])
})

test('where there is no line, a transmission times out and is not supported', () => {
  const { browser, sent, lineOff, unsupported } = lined('none')
  const answer = browser.transmitTextDataOverIP(
    'http://example.test/',
    '',
    'EUC-JP',
  ) as unknown[]

  assert.equal(answer[0], -3)
  assert.ok(Number.isNaN(answer[1]))
  assert.equal(answer[2], '')
  assert.deepEqual(unsupported, ['transmitTextDataOverIP'])
  assert.deepEqual(lineOff, [])
  assert.deepEqual(sent, [])
})

test('a document over the line is told it came by the line, and one of the broadcast that it came by the broadcast', () => {
  const over = lined('on', { overTheLine: () => true }).browser
  const broadcast = lined('on').browser

  assert.equal(over.isBeingBroadcast('HTTPServer'), 1)
  assert.equal(over.getBrowserStatus('TerrP', 'IRDState', 'Link'), 1)
  assert.equal(over.getBrowserStatus('TerrP', 'IRDState', 'Broadcast'), 0)
  assert.equal(broadcast.isBeingBroadcast('HTTPServer'), 0)
  assert.equal(broadcast.getBrowserStatus('TerrP', 'IRDState', 'Link'), 0)
  assert.equal(broadcast.getBrowserStatus('TerrP', 'IRDState', 'Broadcast'), 1)
  assert.ok(Number.isNaN(broadcast.getBrowserStatus('TerrP', 'IRDState', 'x')))
  assert.ok(Number.isNaN(broadcast.getBrowserStatus('TerrP', 'Other', 'Link')))
})

const AIT = 'http://hc.example.test/p/a.ait'

const STARTS_BY_ITSELF: AitApplication = {
  orgId: 16,
  appId: 1,
  controlCode: CONTROL_CODE.autostart,
  entryUrl: 'http://hc.example.test/p/index.html',
}

function hybridcast(over: Partial<BrowserHost> = {}) {
  return lined('on', { hybridcast: () => true, ...over })
}

const HYBRIDCAST_QUERIES: [string, ...string[]][] = [
  ['APIGroup', 'AITControlledApp.Start'],
  ['AITControlledAppEngineFunction', 'IPTV-F', 'HTML5_ph0'],
  ['AITTransportMethod', 'XML', 'HTTP'],
]

test('Hybridcast is supported only while the viewer allows it, and only the HTML5 engine of phase 0 and the AIT in XML over HTTP', () => {
  const allowed = hybridcast().browser
  const refused = lined('on').browser

  for (const [name, ...info] of HYBRIDCAST_QUERIES) {
    assert.equal(allowed.getBrowserSupport('ARIB', name, ...info), 1, name)
    assert.equal(refused.getBrowserSupport('ARIB', name, ...info), 0, name)
  }

  assert.equal(
    allowed.getBrowserSupport(
      'ARIB',
      'AITControlledAppEngineFunction',
      'IPTV-F',
      'HTML5_ph1',
    ),
    0,
  )
  assert.equal(
    allowed.getBrowserSupport('ARIB', 'AITTransportMethod', 'Section', 'DC'),
    0,
  )
  assert.equal(
    allowed.getBrowserSupport('other', 'APIGroup', 'AITControlledApp.Start'),
    0,
  )
})

test('the resident application of Hybridcast answers five items with no maker named, and is ignored as before while Hybridcast is not allowed', () => {
  const answer = hybridcast().browser.getResidentAppVersion('AITControlledApp')

  assert.deepEqual(answer, [MAKER_ID, 'Vela', '1', '0', ''])
  assert.equal(MAKER_ID, '')
  assert.equal(hybridcast().browser.getResidentAppVersion('VOD'), 1)
  assert.equal(lined('on').browser.getResidentAppVersion('AITControlledApp'), 1)
})

test('receiving an AIT starts reading it and answers 1 at once, and fails for an address that is not on the line or when too many are kept', () => {
  const { browser, calls } = hybridcast()

  assert.equal(browser.startReceivingAIT(AIT), 1)
  assert.ok(Number.isNaN(browser.startReceivingAIT('/40/0000/a.ait')))
  assert.ok(Number.isNaN(browser.startReceivingAIT()))
  assert.ok(
    Number.isNaN(
      browser.startReceivingAIT('http://hc.example.test/too-many.ait'),
    ),
  )
  assert.deepEqual(calls, [
    `receive ${AIT}`,
    'receive http://hc.example.test/too-many.ait',
  ])
})

test('an AIT received is answered as the type and its applications, 0 while it is read or was never asked for, -1 when it failed, and NaN without an address', () => {
  const kept = new Map<string, ReturnType<BrowserHost['receivedAit']>>([
    [AIT, [STARTS_BY_ITSELF]],
    ['http://hc.example.test/waiting.ait', 'waiting'],
    ['http://hc.example.test/failed.ait', 'failed'],
  ])
  const { browser } = hybridcast({ receivedAit: (uri) => kept.get(uri) })
  const received = browser.getReceivedAIT(AIT) as unknown[][]

  assert.equal(received[0][0], 0x0010)
  assert.deepEqual(received[1], [
    '10',
    '1',
    1,
    'http://hc.example.test/p/index.html',
  ])
  assert.equal(browser.getReceivedAIT('http://hc.example.test/waiting.ait'), 0)
  assert.equal(browser.getReceivedAIT('http://hc.example.test/never.ait'), 0)
  assert.equal(browser.getReceivedAIT('http://hc.example.test/failed.ait'), -1)
  assert.ok(Number.isNaN(browser.getReceivedAIT()))
})

test('starting an application of an AIT read again, named in hexadecimal, asks the player to start it and leaves the script', () => {
  const read: string[] = []
  const { browser, calls } = hybridcast({
    readAit: (uri) => {
      read.push(uri)

      return [STARTS_BY_ITSELF]
    },
  })

  assert.throws(
    () => browser.startAITControlledApp('10', '1', AIT),
    DocumentLeft,
  )
  assert.deepEqual(read, [AIT])
  assert.deepEqual(calls, [`start ${AIT} 16 1`])
})

test('starting an application fails, and the player is told it did not open, when the AIT names none to start by these identifiers, cannot be read, or has no address', () => {
  const presentOnly: AitApplication = {
    ...STARTS_BY_ITSELF,
    controlCode: CONTROL_CODE.present,
  }
  const cases: [BrowserHost['readAit'], unknown[]][] = [
    [() => [STARTS_BY_ITSELF], ['10', '2', AIT]],
    [() => [STARTS_BY_ITSELF], ['16', '1', AIT]],
    [() => [presentOnly], ['10', '1', AIT]],
    [() => null, ['10', '1', AIT]],
    [() => [STARTS_BY_ITSELF], ['10', '1']],
    [() => [STARTS_BY_ITSELF], ['0x10', '1', AIT]],
  ]

  for (const [readAit, args] of cases) {
    const { browser, calls } = hybridcast({ readAit })

    assert.ok(
      Number.isNaN(browser.startAITControlledApp(...args)),
      String(args),
    )
    assert.deepEqual(calls, ['unopened'], String(args))
  }
})

test('an application that failed to start before is not started again while the broadcast stays open, and is said not to open', () => {
  const read: string[] = []
  const { browser, calls } = hybridcast({
    readAit: (uri) => {
      read.push(uri)

      return [STARTS_BY_ITSELF]
    },
    failedBefore: (start) =>
      start.ait === AIT && start.orgId === 16 && start.appId === 1,
  })

  assert.ok(Number.isNaN(browser.startAITControlledApp('10', '1', AIT)))
  assert.deepEqual(read, [])
  assert.deepEqual(calls, ['unopened'])
})

test('starting an application whose AIT is awaited stops the script, to be run again with it', () => {
  const { browser, calls } = hybridcast({
    readAit: () => {
      throw new LineAwaited()
    },
  })

  assert.throws(
    () => browser.startAITControlledApp('10', '1', AIT),
    LineAwaited,
  )
  assert.deepEqual(calls, [])
})

test('while Hybridcast is not allowed, receiving and starting fail as unsupported, and asking what was received fails quietly', () => {
  for (const line of ['on', 'off', 'none'] as const) {
    const { browser, calls, unsupported, warnings } = lined(line)

    assert.ok(Number.isNaN(browser.startReceivingAIT(AIT)))
    assert.ok(Number.isNaN(browser.startAITControlledApp('10', '1', AIT)))
    assert.ok(Number.isNaN(browser.getReceivedAIT(AIT)))
    assert.deepEqual(unsupported, [
      'startReceivingAIT',
      'startAITControlledApp',
    ])
    assert.deepEqual(warnings, ['not connected: getReceivedAIT'])
    assert.deepEqual(calls, [])
  }
})
