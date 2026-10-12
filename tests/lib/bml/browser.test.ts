import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  IGNORED_FUNCTIONS,
  REFUSED_FUNCTIONS,
  SUPPORTED_FUNCTIONS,
  browserOf,
  registersOf,
  type BrowserHost,
} from '@/lib/bml/browser'
import { PersistentMemory } from '@/lib/bml/memory'
import { DocumentLeft } from '@/lib/bml/scripts'

type Browser = Record<string, (...args: unknown[]) => unknown> & {
  Ureg: string[]
  Greg: string[]
}

function host(over: Partial<BrowserHost> = {}) {
  const calls: string[] = []
  const unsupported: string[] = []
  const warnings: string[] = []
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
    memory: new PersistentMemory(),
    registers: { Ureg: registersOf(), Greg: registersOf() },
    startTimer: (code, everyMs, times) => {
      calls.push(`timer ${String(code)} ${String(everyMs)} ${String(times)}`)

      return 5
    },
    stopTimer: (id) => id === 5,
    sleep: (ms) => calls.push(`sleep ${String(ms)}`),
    lock: (reference) => (reference === 'nowhere' ? 'bad' : 'held'),
    unlock: (reference) => calls.push(`unlock ${String(reference)}`),
    lockedModules: () => ['/40/0001'],
    unsupported: (what) => unsupported.push(what),
    warn: (what) => warnings.push(what),
    ...over,
  }

  return {
    browser: browserOf(made) as Browser,
    calls,
    unsupported,
    warnings,
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
  assert.equal(browser.unlockModuleOnMemory('~/0001'), 1)
  assert.equal(browser.unlockAllModulesOnMemory(), 1)
  assert.deepEqual(browser.getLockedModuleInfo(), [['/40/0001', 1, 1]])
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
