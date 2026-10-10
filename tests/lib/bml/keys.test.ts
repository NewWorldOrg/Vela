import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { NavLinks, PageElement } from '@/lib/bml/document'
import {
  BML_KEY_CODE,
  BML_KEYS,
  answerTo,
  firstFocus,
  keyFromKeyboard,
  keysOf,
  navigationOf,
  type Navigation,
} from '@/lib/bml/keys'

test('the keyboard stands in for the remote control: arrows, Enter, Backspace, B R G Y, the digits and D', () => {
  const cases: [string, string][] = [
    ['ArrowUp', 'up'],
    ['ArrowDown', 'down'],
    ['ArrowLeft', 'left'],
    ['ArrowRight', 'right'],
    ['Enter', 'enter'],
    ['Backspace', 'back'],
    ['b', 'blue'],
    ['R', 'red'],
    ['g', 'green'],
    ['y', 'yellow'],
    ['d', 'd'],
    ['0', '0'],
    ['9', '9'],
  ]

  for (const [key, remote] of cases) {
    assert.equal(keyFromKeyboard({ key }), remote, key)
  }
})

test('Escape, Space and the player’s own letters are not the remote control’s, nor is a key held with Ctrl, Meta or Alt', () => {
  for (const key of ['Escape', ' ', 'k', 'f', 'c', 'm', 'Tab']) {
    assert.equal(keyFromKeyboard({ key }), null, key)
  }

  assert.equal(keyFromKeyboard({ key: 'b', ctrlKey: true }), null)
  assert.equal(keyFromKeyboard({ key: 'r', metaKey: true }), null)
  assert.equal(keyFromKeyboard({ key: '1', altKey: true }), null)
})

test('each key has the code a document reads', () => {
  assert.deepEqual(
    Object.fromEntries(BML_KEYS.map((key) => [key, BML_KEY_CODE[key]])),
    {
      up: 1,
      down: 2,
      left: 3,
      right: 4,
      '0': 5,
      '1': 6,
      '2': 7,
      '3': 8,
      '4': 9,
      '5': 10,
      '6': 11,
      '7': 12,
      '8': 13,
      '9': 14,
      enter: 18,
      back: 19,
      d: 20,
      blue: 21,
      red: 22,
      green: 23,
      yellow: 24,
    },
  )
})

test('the keys a document takes are those of the groups it names, in the remote control’s order', () => {
  assert.deepEqual(keysOf(['basic']), [
    'up',
    'down',
    'left',
    'right',
    'enter',
    'back',
    'd',
  ])
  assert.deepEqual(keysOf(['data-button', 'basic']), [
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
  assert.deepEqual(keysOf(['numeric-tuning']), [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
  ])
  assert.deepEqual(keysOf([]), [])
})

function element(nav: NavLinks, children: PageElement[] = []): PageElement {
  return {
    kind: 'element',
    tag: 'p',
    bmlTag: 'p',
    attributes: [],
    style: '',
    nav,
    children,
  }
}

test('every element with a nav-index can take the focus, the first of two with the same index winning', () => {
  const first = { index: 2, down: 5 }
  const navigation = navigationOf(
    element({}, [
      element(first),
      element({ index: 5, up: 2 }, [element({ index: 2 })]),
      element({}),
    ]),
  )

  assert.deepEqual([...navigation.keys()], [2, 5])
  assert.equal(navigation.get(2), first)
  assert.equal(firstFocus(navigation), 2)
  assert.equal(firstFocus(new Map()), null)
})

const GRID: Navigation = new Map([
  [0, { index: 0, right: 1, down: 2 }],
  [1, { index: 1, left: 0, down: 3 }],
  [2, { index: 2, up: 0, right: 3 }],
  [3, { index: 3, up: 1, left: 2, down: 7 }],
])

test('each arrow moves the focus where the focused element says', () => {
  assert.deepEqual(answerTo('right', GRID, 0), {
    answer: 'moved',
    from: 0,
    to: 1,
  })
  assert.deepEqual(answerTo('down', GRID, 1), {
    answer: 'moved',
    from: 1,
    to: 3,
  })
  assert.deepEqual(answerTo('left', GRID, 3), {
    answer: 'moved',
    from: 3,
    to: 2,
  })
  assert.deepEqual(answerTo('up', GRID, 2), { answer: 'moved', from: 2, to: 0 })
})

test('an arrow the focused element says nothing of, or that points at no element, leaves the focus where it is', () => {
  assert.deepEqual(answerTo('up', GRID, 0), { answer: 'stayed' })
  assert.deepEqual(answerTo('left', GRID, 0), { answer: 'stayed' })
  assert.deepEqual(answerTo('down', GRID, 3), { answer: 'stayed' })
  assert.deepEqual(answerTo('down', GRID, null), { answer: 'stayed' })
  assert.deepEqual(answerTo('up', new Map([[4, { index: 4, up: 4 }]]), 4), {
    answer: 'stayed',
  })
})

test('Enter decides on the focused element, and any other key is handed to the document by its code', () => {
  assert.deepEqual(answerTo('enter', GRID, 3), { answer: 'decided', on: 3 })
  assert.deepEqual(answerTo('enter', GRID, null), {
    answer: 'pressed',
    code: 18,
  })
  assert.deepEqual(answerTo('blue', GRID, 0), { answer: 'pressed', code: 21 })
  assert.deepEqual(answerTo('back', GRID, 0), { answer: 'pressed', code: 19 })
  assert.deepEqual(answerTo('7', GRID, 0), { answer: 'pressed', code: 12 })
})
