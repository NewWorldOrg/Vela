import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { RuntimeMessage } from '@/lib/bml/messages'
import {
  DATA_BROADCAST_CLOSED,
  KEYS_UNTIL_TOLD,
  SAID_LINE_OFF,
  SAID_RECEIVING,
  SAID_UNOPENED,
  SAID_UNREACHED,
  SAID_UNSUPPORTED,
  bandPlace,
  dataBroadcastAfter,
  dataBroadcastSays,
  offersDataBroadcast,
  opensByItself,
  pictureTransform,
  type DataBroadcastStep,
  type DataBroadcastView,
} from '@/lib/data-broadcast-view'

function after(...steps: DataBroadcastStep[]): DataBroadcastView {
  return steps.reduce(dataBroadcastAfter, DATA_BROADCAST_CLOSED)
}

const OPEN: DataBroadcastStep = { on: 'toggle', availability: 'ready' }

test('there is no control while there is no broadcast, or it has not come in yet', () => {
  assert.equal(offersDataBroadcast('none', DATA_BROADCAST_CLOSED), false)
  assert.equal(offersDataBroadcast('absent', DATA_BROADCAST_CLOSED), false)
  assert.equal(offersDataBroadcast('ready', DATA_BROADCAST_CLOSED), true)
})

test('the control stays while it is open, so it can be closed', () => {
  assert.equal(offersDataBroadcast('absent', after(OPEN)), true)
})

test('it opens only when it can be opened, and the toggle closes it again', () => {
  assert.equal(after({ on: 'toggle', availability: 'absent' }).open, false)
  assert.equal(after({ on: 'toggle', availability: 'none' }).open, false)
  assert.equal(after(OPEN).open, true)
  assert.equal(after(OPEN, { on: 'toggle', availability: 'ready' }).open, false)
  assert.equal(
    after(OPEN, { on: 'toggle', availability: 'absent' }).open,
    false,
  )
})

const ASKED: Parameters<typeof opensByItself>[1] = {
  autoOpens: true,
  autoStart: true,
  availability: 'ready',
  openedThisProgramme: false,
}

test('it does not open by itself until the setting says so', () => {
  assert.equal(
    opensByItself(DATA_BROADCAST_CLOSED, { ...ASKED, autoOpens: false }),
    false,
  )
  assert.equal(opensByItself(DATA_BROADCAST_CLOSED, ASKED), true)
})

test('with the setting on, it opens by itself only when the catalog asks and the start document is in', () => {
  assert.equal(
    opensByItself(DATA_BROADCAST_CLOSED, { ...ASKED, autoStart: false }),
    false,
  )
  assert.equal(
    opensByItself(DATA_BROADCAST_CLOSED, { ...ASKED, availability: 'absent' }),
    false,
  )
  assert.equal(
    opensByItself(DATA_BROADCAST_CLOSED, { ...ASKED, availability: 'none' }),
    false,
  )
})

test('once it was open during the programme, it does not open by itself again, so one closed by hand stays closed', () => {
  assert.equal(opensByItself(after(OPEN), ASKED), false)
  assert.equal(
    opensByItself(DATA_BROADCAST_CLOSED, {
      ...ASKED,
      openedThisProgramme: true,
    }),
    false,
  )
})

test('opening by itself is the same as opening by hand, and leaves an open one alone', () => {
  const byItself = after({ on: 'autoStart', availability: 'ready' })

  assert.deepEqual(byItself, after(OPEN))
  assert.equal(after({ on: 'autoStart', availability: 'absent' }).open, false)

  const open = after(OPEN, {
    on: 'runtime',
    message: { kind: 'usedKeys', keys: ['up'] },
  })

  assert.equal(
    dataBroadcastAfter(open, { on: 'autoStart', availability: 'ready' }),
    open,
  )
})

test('it opens with the keys a document takes until it says otherwise', () => {
  assert.deepEqual(after(OPEN).usedKeys, KEYS_UNTIL_TOLD)
  assert.deepEqual(KEYS_UNTIL_TOLD, [
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
  ])
})

test('the rectangle and the keys the runtime says are kept while open, and let go when closed', () => {
  const rect = { left: 560, top: 60, width: 360, height: 203 }
  const open = after(
    OPEN,
    { on: 'runtime', message: { kind: 'videoRect', rect } },
    { on: 'runtime', message: { kind: 'usedKeys', keys: ['enter'] } },
  )

  assert.deepEqual(open.rect, rect)
  assert.deepEqual(open.usedKeys, ['enter'])

  const shut = dataBroadcastAfter(open, { on: 'toggle', availability: 'ready' })

  assert.equal(shut.rect, null)
  assert.deepEqual(shut.usedKeys, KEYS_UNTIL_TOLD)
})

test('what the runtime says while closed changes nothing', () => {
  const view = after({
    on: 'runtime',
    message: {
      kind: 'videoRect',
      rect: { left: 0, top: 0, width: 10, height: 10 },
    },
  })

  assert.deepEqual(view, DATA_BROADCAST_CLOSED)
})

test('a broken document closes it and is said, and the next opening forgets that', () => {
  const broken = after(OPEN, {
    on: 'runtime',
    message: { kind: 'error', reason: 'malformed' },
  })

  assert.equal(broken.open, false)
  assert.equal(broken.failed, true)
  assert.equal(offersDataBroadcast('ready', broken), true)
  assert.equal(dataBroadcastAfter(broken, OPEN).failed, false)
  assert.equal(dataBroadcastAfter(broken, { on: 'quiet' }).failed, false)
})

test('a document that exits closes it without saying anything', () => {
  const view = after(OPEN, { on: 'runtime', message: { kind: 'exit' } })

  assert.equal(view.open, false)
  assert.equal(view.failed, false)
})

test('a service that stops carrying a broadcast closes it; one whose start document is between versions does not', () => {
  assert.equal(
    after(OPEN, { on: 'availability', availability: 'none' }).open,
    false,
  )
  assert.equal(
    after(OPEN, { on: 'availability', availability: 'absent' }).open,
    true,
  )
})

test('a page still coming in is said only after three seconds of waiting, and not once it has come', () => {
  const waiting = after(OPEN, {
    on: 'runtime',
    message: { kind: 'waiting', waiting: true },
  })

  assert.equal(dataBroadcastSays(waiting), null)

  const slow = dataBroadcastAfter(waiting, { on: 'slow', waits: waiting.waits })

  assert.equal(dataBroadcastSays(slow), SAID_RECEIVING)

  const came = dataBroadcastAfter(slow, {
    on: 'runtime',
    message: { kind: 'waiting', waiting: false },
  })

  assert.equal(dataBroadcastSays(came), null)
})

test('the timer of an earlier wait does not speak for a later one', () => {
  const first = after(OPEN, {
    on: 'runtime',
    message: { kind: 'waiting', waiting: true },
  })
  const second = [
    { on: 'runtime', message: { kind: 'waiting', waiting: false } },
    { on: 'runtime', message: { kind: 'waiting', waiting: true } },
  ].reduce(
    (view, step) => dataBroadcastAfter(view, step as DataBroadcastStep),
    first,
  )

  assert.equal(
    dataBroadcastAfter(second, { on: 'slow', waits: first.waits }).slow,
    false,
  )
  assert.equal(
    dataBroadcastAfter(second, { on: 'slow', waits: second.waits }).slow,
    true,
  )
})

test('an unsupported operation is said until its own three seconds are up, and a second one starts them again', () => {
  const once = after(OPEN, {
    on: 'runtime',
    message: { kind: 'unsupported', what: 'script' },
  })

  assert.equal(dataBroadcastSays(once), SAID_UNSUPPORTED)

  const twice = dataBroadcastAfter(once, {
    on: 'runtime',
    message: { kind: 'unsupported', what: 'script' },
  })

  assert.equal(
    dataBroadcastSays(
      dataBroadcastAfter(twice, { on: 'faded', notices: once.notices }),
    ),
    SAID_UNSUPPORTED,
  )
  assert.equal(
    dataBroadcastSays(
      dataBroadcastAfter(twice, { on: 'faded', notices: twice.notices }),
    ),
    null,
  )
})

test('a notice from before the broadcast was closed does not cut short one after it opens again', () => {
  const said = after(OPEN, {
    on: 'runtime',
    message: { kind: 'unsupported', what: 'script' },
  })
  const again = [
    { on: 'toggle', availability: 'ready' },
    OPEN,
    { on: 'runtime', message: { kind: 'unsupported', what: 'script' } },
  ].reduce(
    (view, step) => dataBroadcastAfter(view, step as DataBroadcastStep),
    said,
  )

  assert.equal(
    dataBroadcastAfter(again, { on: 'faded', notices: said.notices })
      .unsupported,
    true,
  )
})

test('the numbers face is chosen while open, and closing goes back to the first face', () => {
  const numbers = after(OPEN, { on: 'numbers', shown: true })

  assert.equal(numbers.numbers, true)
  assert.equal(after({ on: 'numbers', shown: true }).numbers, false)
  assert.equal(
    dataBroadcastAfter(
      dataBroadcastAfter(numbers, { on: 'toggle', availability: 'ready' }),
      OPEN,
    ).numbers,
    false,
  )
})

test('the picture box is laid over the rectangle by its share of the grid', () => {
  assert.equal(pictureTransform(null), undefined)
  assert.equal(
    pictureTransform({ left: 480, top: 135, width: 240, height: 135 }),
    'translate(50%, 25%) scale(0.25, 0.25)',
  )
  assert.equal(
    pictureTransform({ left: 0, top: 0, width: 960, height: 540 }),
    'translate(0%, 0%) scale(1, 1)',
  )
})

test('a script run that starts is remembered until it ends, and one that overruns closes the broadcast as broken', () => {
  const running: DataBroadcastStep = {
    on: 'runtime',
    message: { kind: 'script', state: 'running' },
    nth: 3,
  }
  const done: DataBroadcastStep = {
    on: 'runtime',
    message: { kind: 'script', state: 'done' },
    nth: 4,
  }

  assert.equal(after(OPEN, running).scripting, 3)
  assert.equal(after(OPEN, running, done).scripting, 0)

  const overran = after(OPEN, running, {
    on: 'runtime',
    message: { kind: 'script', state: 'overran' },
    nth: 4,
  })

  assert.equal(overran.open, false)
  assert.equal(overran.failed, true)
})

test('the timer of a script run gives it up only while that run is still the one running', () => {
  const running = (nth: number): DataBroadcastStep => ({
    on: 'runtime',
    message: { kind: 'script', state: 'running' },
    nth,
  })
  const done = (nth: number): DataBroadcastStep => ({
    on: 'runtime',
    message: { kind: 'script', state: 'done' },
    nth,
  })

  const givenUp = after(OPEN, running(3), { on: 'overran', scripting: 3 })

  assert.equal(givenUp.open, false)
  assert.equal(givenUp.failed, true)

  const ended = after(OPEN, running(3), done(4), {
    on: 'overran',
    scripting: 3,
  })

  assert.equal(ended.open, true)
  assert.equal(ended.failed, false)

  const later = after(OPEN, running(3), done(4), running(5), {
    on: 'overran',
    scripting: 3,
  })

  assert.equal(later.open, true)
  assert.equal(later.scripting, 5)
})

test('what the runtime asks to keep changes nothing of the view', () => {
  const kept = after(OPEN, {
    on: 'runtime',
    message: { kind: 'memory', name: 'visits', value: '1' },
  })

  assert.deepEqual(kept, after(OPEN))
})

test('the setting refusing the line is said once while open, and again only after it is opened again', () => {
  const off: DataBroadcastStep = {
    on: 'runtime',
    message: { kind: 'line', said: 'off' },
  }
  const once = after(OPEN, off)

  assert.equal(dataBroadcastSays(once), SAID_LINE_OFF)

  const faded = dataBroadcastAfter(once, {
    on: 'lineFaded',
    lineNotices: once.lineNotices,
  })

  assert.equal(dataBroadcastSays(faded), null)
  assert.equal(dataBroadcastSays(dataBroadcastAfter(faded, off)), null)

  const reopened = [OPEN, OPEN, off].reduce(dataBroadcastAfter, faded)

  assert.equal(dataBroadcastSays(reopened), SAID_LINE_OFF)
})

test('a server not reached is said each time, for its own three seconds, and an unsupported operation goes before it', () => {
  const unreached: DataBroadcastStep = {
    on: 'runtime',
    message: { kind: 'line', said: 'unreached' },
  }
  const once = after(OPEN, unreached)
  const twice = dataBroadcastAfter(
    dataBroadcastAfter(once, {
      on: 'lineFaded',
      lineNotices: once.lineNotices,
    }),
    unreached,
  )

  assert.equal(dataBroadcastSays(once), SAID_UNREACHED)
  assert.equal(dataBroadcastSays(twice), SAID_UNREACHED)
  assert.equal(
    dataBroadcastSays(
      dataBroadcastAfter(twice, {
        on: 'lineFaded',
        lineNotices: once.lineNotices,
      }),
    ),
    SAID_UNREACHED,
  )
  assert.equal(
    dataBroadcastSays(
      dataBroadcastAfter(twice, {
        on: 'runtime',
        message: { kind: 'unsupported', what: 'script' },
      }),
    ),
    SAID_UNSUPPORTED,
  )
})

test('requests over the line change nothing of the view', () => {
  const open = after(OPEN)

  assert.equal(
    dataBroadcastAfter(open, {
      on: 'runtime',
      message: { kind: 'fetch', id: 1, uri: 'http://example.test/' },
    }),
    open,
  )
})

const AIT = 'http://hc.example.test/p/a.ait'

const START = { ait: AIT, orgId: 16, appId: 1 }

const GREG = Array.from({ length: 64 }, (_, at) =>
  at === 44 ? 'nhk:back' : '',
)

function runtime(message: RuntimeMessage, nth: number): DataBroadcastStep {
  return { on: 'runtime', message, nth }
}

const STARTING = runtime({ kind: 'startApp', start: START, greg: GREG }, 7)

test('a start the documents ask for closes them for the application, keeps the shared registers, and lays the picture back over the whole box', () => {
  const view = after(
    OPEN,
    runtime(
      { kind: 'videoRect', rect: { left: 0, top: 0, width: 480, height: 270 } },
      1,
    ),
    STARTING,
  )

  assert.equal(view.open, true)
  assert.deepEqual(view.hybridcast, { start: START, nth: 7, address: null })
  assert.deepEqual(view.greg, GREG)
  assert.equal(view.rect, null)
  assert.equal(dataBroadcastSays(view), null)
})

test('the application started is kept with the address its frame opens, and only for the start it answers', () => {
  const started = after(OPEN, STARTING, {
    on: 'appStarted',
    nth: 7,
    address: '/api/live/a/app/t/p/index.html',
  })

  assert.equal(started.hybridcast?.address, '/api/live/a/app/t/p/index.html')
  assert.deepEqual(
    after(OPEN, STARTING, { on: 'appStarted', nth: 6, address: '/x' })
      .hybridcast?.address,
    null,
  )
})

test('an application that did not open goes back to the documents, is said once, and is not asked for again while open', () => {
  const view = after(OPEN, STARTING, { on: 'appUnopened', nth: 7 })

  assert.equal(view.open, true)
  assert.equal(view.hybridcast, null)
  assert.equal(view.returns, 1)
  assert.deepEqual(view.greg, GREG)
  assert.deepEqual(view.failedStarts, [START])
  assert.equal(dataBroadcastSays(view), SAID_UNOPENED)

  const faded = dataBroadcastAfter(view, {
    on: 'appFaded',
    appNotices: view.appNotices,
  })

  assert.equal(dataBroadcastSays(faded), null)
})

test('ten failed starts one after another are said once while open, and again only after it is opened again', () => {
  let view = after(OPEN)

  for (let nth = 1; nth <= 10; nth += 1) {
    view = dataBroadcastAfter(view, runtime({ kind: 'unopened' }, nth))

    if (nth === 1) {
      assert.equal(dataBroadcastSays(view), SAID_UNOPENED)
      view = dataBroadcastAfter(view, { on: 'appFaded', appNotices: 1 })
    }
  }

  assert.equal(dataBroadcastSays(view), null)

  const again = after(
    OPEN,
    { on: 'toggle', availability: 'ready' },
    OPEN,
    runtime({ kind: 'unopened' }, 11),
  )

  assert.equal(dataBroadcastSays(again), SAID_UNOPENED)
})

test('closing the application, or the data button while it runs, goes back to the documents with the shared registers, and an answer for it after that is not taken', () => {
  for (const closing of [
    { on: 'appClosed' },
    { on: 'toggle', availability: 'ready' },
  ] as DataBroadcastStep[]) {
    const view = after(OPEN, STARTING, closing)

    assert.equal(view.open, true)
    assert.equal(view.hybridcast, null)
    assert.equal(view.returns, 1)
    assert.deepEqual(view.greg, GREG)
    assert.deepEqual(view.failedStarts, [])

    const late = dataBroadcastAfter(view, { on: 'appUnopened', nth: 7 })

    assert.equal(late, view)
  }
})

test('closing the broadcast, or losing it, ends the application and forgets the registers and the starts that failed', () => {
  const failed = after(OPEN, STARTING, { on: 'appUnopened', nth: 7 })
  const running = after(OPEN, STARTING)

  for (const view of [
    dataBroadcastAfter(failed, { on: 'toggle', availability: 'ready' }),
    dataBroadcastAfter(running, { on: 'availability', availability: 'none' }),
  ]) {
    assert.equal(view.open, false)
    assert.equal(view.hybridcast, null)
    assert.equal(view.greg, null)
    assert.deepEqual(view.failedStarts, [])
  }
})

test('what the documents say after they were closed for the application is not taken, as they are gone', () => {
  const running = after(OPEN, STARTING)

  for (const message of [
    { kind: 'error', reason: 'malformed' },
    { kind: 'exit' },
    { kind: 'unsupported', what: 'x' },
  ] as RuntimeMessage[]) {
    assert.equal(dataBroadcastAfter(running, runtime(message, 9)), running)
  }
})

test('the band stands under the box in a window, whatever points at it, and over the picture in fullscreen, where there is no room below', () => {
  assert.equal(bandPlace(false), 'under')
  assert.equal(bandPlace(true), 'over')
})
