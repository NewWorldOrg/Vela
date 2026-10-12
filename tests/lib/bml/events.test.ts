import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  eventItemsOf,
  listening,
  listensFor,
  namesModule,
  privateDataOf,
} from '@/lib/bml/events'

const BASE = { tag: 0x40, module: 0, name: 'startup.bml' }

const EVENT = {
  group: 0,
  id: 7,
  type: 2,
  immediate: true,
  at: 0,
  privateData: new Uint8Array(0),
}

test('the document’s items are read with their type, their attributes and whether they are subscribed', () => {
  const items = eventItemsOf([
    {
      id: 'a',
      type: 'ModuleUpdated',
      attributes: [
        ['Module_Ref', '/40/0001'],
        ['subscribe', 'subscribe'],
        ['onoccur', 'f()'],
      ],
    },
    { id: 'b', type: 'Unknown', attributes: [['onoccur', 'g()']] },
    { id: null, type: null, attributes: [] },
  ])

  assert.equal(items[0].type, 'ModuleUpdated')
  assert.equal(items[0].subscribed, true)
  assert.equal(items[0].attributes.get('module_ref'), '/40/0001')
  assert.equal(items[1].type, null)
  assert.equal(items[1].subscribed, false)
  assert.equal(items[2].id, null)
})

test('an item listens when it is of the type, subscribed and has a handler', () => {
  const items = eventItemsOf([
    {
      id: 'yes',
      type: 'TimerFired',
      attributes: [
        ['subscribe', 'subscribe'],
        ['onoccur', 'f()'],
      ],
    },
    { id: 'quiet', type: 'TimerFired', attributes: [['onoccur', 'f()']] },
    {
      id: 'mute',
      type: 'TimerFired',
      attributes: [['subscribe', 'subscribe']],
    },
    {
      id: 'other',
      type: 'NPTReferred',
      attributes: [
        ['subscribe', 'subscribe'],
        ['onoccur', 'f()'],
      ],
    },
  ])

  assert.deepEqual(
    listening(items, 'TimerFired').map((item) => item.id),
    ['yes'],
  )

  items[1].subscribed = true
  assert.deepEqual(
    listening(items, 'TimerFired').map((item) => item.id),
    ['yes', 'quiet'],
  )
})

test('an event message is listened for by group, and by id and version unless left out or 255', () => {
  const item = (attributes: [string, string][]) =>
    eventItemsOf([{ id: 'm', type: 'EventMessageFired', attributes }])[0]

  assert.equal(listensFor(item([['message_group_id', '0']]), EVENT), true)
  assert.equal(listensFor(item([['message_group_id', '1']]), EVENT), false)
  assert.equal(
    listensFor(
      item([
        ['message_group_id', '0'],
        ['message_id', '7'],
      ]),
      EVENT,
    ),
    true,
  )
  assert.equal(
    listensFor(
      item([
        ['message_group_id', '0'],
        ['message_id', '8'],
      ]),
      EVENT,
    ),
    false,
  )
  assert.equal(
    listensFor(
      item([
        ['message_group_id', '0'],
        ['message_id', '255'],
      ]),
      EVENT,
    ),
    true,
  )
  assert.equal(
    listensFor(
      item([
        ['message_group_id', '0'],
        ['message_version', '2'],
      ]),
      EVENT,
    ),
    true,
  )
  assert.equal(
    listensFor(
      item([
        ['message_group_id', '0'],
        ['message_version', '3'],
      ]),
      EVENT,
    ),
    false,
  )
  assert.equal(listensFor(item([]), EVENT), true)
})

test('an item with an es_ref listens only when it names a stream the broadcast carries', () => {
  const item = (reference: string) =>
    eventItemsOf([
      {
        id: 'm',
        type: 'EventMessageFired',
        attributes: [
          ['es_ref', reference],
          ['message_group_id', '0'],
        ],
      },
    ])[0]

  assert.equal(listensFor(item('/40'), EVENT, [0x40, 0x60]), true)
  assert.equal(listensFor(item('/60/0001'), EVENT, [0x40, 0x60]), true)
  assert.equal(listensFor(item('arib-dc://-1.-1.-1/40'), EVENT, [0x40]), true)
  assert.equal(listensFor(item('/72'), EVENT, [0x40, 0x60]), false)
  assert.equal(listensFor(item('/40'), EVENT), false)
  assert.equal(listensFor(item('40'), EVENT, [0x40]), false)
  assert.equal(listensFor(item(''), EVENT, [0x40]), false)
})

test('an event message that names its stream reaches only the items whose es_ref names that stream, carousel or not', () => {
  const item = (reference?: string) =>
    eventItemsOf([
      {
        id: 'm',
        type: 'EventMessageFired',
        attributes: [
          ...(reference === undefined
            ? []
            : ([['es_ref', reference]] as [string, string][])),
          ['message_group_id', '0'],
        ],
      },
    ])[0]
  const onEvents = { ...EVENT, componentTag: 0x5e }
  const onCarousel = { ...EVENT, componentTag: 0x40 }

  assert.equal(listensFor(item('/5E'), onEvents, [0x40]), true)
  assert.equal(listensFor(item('/5e'), onEvents, []), true)
  assert.equal(listensFor(item('/40'), onEvents, [0x40]), false)
  assert.equal(listensFor(item('/5E'), onCarousel, [0x40]), false)
  assert.equal(listensFor(item('/40'), onCarousel, [0x40]), true)
  assert.equal(listensFor(item(), onEvents, [0x40]), true)
  assert.equal(listensFor(item('5E'), onEvents, [0x40]), false)
})

test('an item names a module by an absolute path or one within the carousel', () => {
  const item = (reference?: string) =>
    eventItemsOf([
      {
        id: 'u',
        type: 'ModuleUpdated',
        attributes: reference ? [['module_ref', reference]] : [],
      },
    ])[0]

  assert.equal(namesModule(item('/40/0001'), BASE, { tag: 0x40, id: 1 }), true)
  assert.equal(namesModule(item('~/0001'), BASE, { tag: 0x40, id: 1 }), true)
  assert.equal(namesModule(item('../0001'), BASE, { tag: 0x40, id: 1 }), true)
  assert.equal(namesModule(item('/60/0001'), BASE, { tag: 0x40, id: 1 }), false)
  assert.equal(namesModule(item('/40/0002'), BASE, { tag: 0x40, id: 1 }), false)
  assert.equal(namesModule(item(), BASE, { tag: 0x40, id: 1 }), false)
  assert.equal(namesModule(item('nonsense'), BASE, { tag: 0x40, id: 1 }), false)
})

test('private data is read as text when it is UTF-8, and byte by byte when it is not', () => {
  assert.equal(privateDataOf(new TextEncoder().encode('天気')), '天気')
  assert.equal(privateDataOf(Uint8Array.from([0x41, 0xff, 0x42])), 'AÿB')
})
