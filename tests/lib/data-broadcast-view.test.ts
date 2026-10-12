import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  DATA_BROADCAST_CLOSED,
  KEYS_UNTIL_TOLD,
  SAID_RECEIVING,
  SAID_UNSUPPORTED,
  dataBroadcastAfter,
  dataBroadcastSays,
  offersDataBroadcast,
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
