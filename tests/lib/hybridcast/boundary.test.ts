import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  EVERYTHING,
  bitmapAt,
  boundaryOf,
  insideBoundary,
  permits,
  permittedEverywhere,
  receiverIdHandedOver,
  type Permission,
} from '@/lib/hybridcast/boundary'

const ALL: Permission[] = [
  'broadcastVideo',
  'overTheVideo',
  'eventInformation',
  'persistentMemory',
  'boundaryExtension',
  'deviceIdentifier',
  'vod',
  'receiver',
]

function permitted(bitmap: number): Permission[] {
  return ALL.filter((permission) => permits(bitmap, permission))
}

test('a bitmap with 000 above permits everything with all thirteen bits below set, and nothing with any other value', () => {
  assert.deepEqual(permitted(EVERYTHING), ALL)
  assert.deepEqual(permitted(0x0000), [])
  assert.deepEqual(permitted(0x1ffe), [])
  assert.deepEqual(permitted(0x0fff), [])
})

test('a bitmap with 001 above permits bit by bit', () => {
  assert.deepEqual(permitted(0x2000 | (1 << 5)), ['receiver'])
  assert.deepEqual(permitted(0x2000 | (1 << 7) | (1 << 10)), [
    'eventInformation',
    'deviceIdentifier',
  ])
  assert.deepEqual(permitted(0x2000 | (1 << 12) | (1 << 11) | (1 << 9)), [
    'broadcastVideo',
    'overTheVideo',
    'persistentMemory',
  ])
  assert.deepEqual(permitted(0x3fff), ALL)
})

test('a bitmap with any other value above permits nothing', () => {
  assert.deepEqual(permitted(0x4000 | EVERYTHING), [])
  assert.deepEqual(permitted(0xffff), [])
})

const NARROW = 0x2000 | (1 << 5)

test('the managed URL that applies most narrowly gives the bitmap, and the later of two as narrow', () => {
  const boundary = [
    { permissionBitmap: EVERYTHING, managedUrls: ['http://example.test'] },
    {
      permissionBitmap: NARROW,
      managedUrls: ['http://example.test/narrow/'],
    },
    { permissionBitmap: 0x2000, managedUrls: ['http://example.test'] },
  ]

  assert.equal(bitmapAt(boundary, 'http://example.test/narrow/a.html'), NARROW)
  assert.equal(bitmapAt(boundary, 'http://example.test/wide.html'), 0x2000)
})

test('a deeper host is narrower than a shorter path on a shallower one', () => {
  const boundary = [
    { permissionBitmap: NARROW, managedUrls: ['http://example.test/hc/p/'] },
    { permissionBitmap: EVERYTHING, managedUrls: ['http://hc.example.test'] },
  ]

  assert.equal(bitmapAt(boundary, 'http://hc.example.test/hc/p/'), EVERYTHING)
})

test('a managed URL applies to its host and the hosts under it, on the same scheme, and under its path', () => {
  const boundary = [
    {
      permissionBitmap: EVERYTHING,
      managedUrls: ['http://example.test', 'https://example.test/app/'],
    },
  ]

  assert.equal(insideBoundary(boundary, 'http://example.test/a'), true)
  assert.equal(insideBoundary(boundary, 'http://hc.example.test/p/'), true)
  assert.equal(insideBoundary(boundary, 'https://hc.example.test/app/x'), true)
  assert.equal(insideBoundary(boundary, 'https://example.test/other'), false)
  assert.equal(insideBoundary(boundary, 'http://notexample.test/'), false)
  assert.equal(insideBoundary(boundary, 'http://example.test.evil/'), false)
  assert.equal(insideBoundary(boundary, 'http://other.test/'), false)
  assert.equal(insideBoundary(boundary, 'ftp://example.test/'), false)
  assert.equal(insideBoundary(boundary, 'not a url'), false)
})

test('a pair without managed URLs applies everywhere, less narrowly than any that names one', () => {
  const boundary = [
    { permissionBitmap: NARROW, managedUrls: [] },
    { permissionBitmap: EVERYTHING, managedUrls: ['http://example.test'] },
  ]

  assert.equal(bitmapAt(boundary, 'http://example.test/'), EVERYTHING)
  assert.equal(bitmapAt(boundary, 'http://elsewhere.test/'), NARROW)
})

test('no boundary at all permits everything everywhere', () => {
  assert.equal(bitmapAt([], 'https://anywhere.test/'), EVERYTHING)
  assert.equal(bitmapAt([], 'blob:https://anywhere.test/x'), null)
})

test('a boundary is read in the shape Carina answers it, and refused in any other', () => {
  assert.deepEqual(
    boundaryOf([{ permissionBitmap: 0x1fff, managedUrls: ['http://a.test'] }]),
    [{ permissionBitmap: 0x1fff, managedUrls: ['http://a.test'] }],
  )
  assert.deepEqual(boundaryOf([]), [])
  assert.equal(boundaryOf(null), null)
  assert.equal(
    boundaryOf([{ permissionBitmap: 0x10000, managedUrls: [] }]),
    null,
  )
  assert.equal(boundaryOf([{ permissionBitmap: 1, managedUrls: [1] }]), null)
  assert.equal(boundaryOf([{ permissionBitmap: 1.5, managedUrls: [] }]), null)
  assert.equal(
    boundaryOf(
      Array.from({ length: 65 }, () => ({
        permissionBitmap: 0,
        managedUrls: [],
      })),
    ),
    null,
  )
})

test('the receiver identifier is handed over only where no pair of the boundary refuses it', () => {
  const id = 0x2000 | (1 << 7)

  assert.equal(permittedEverywhere([], 'deviceIdentifier'), true)
  assert.equal(
    permittedEverywhere(
      [
        { permissionBitmap: EVERYTHING, managedUrls: ['http://a.test'] },
        { permissionBitmap: id, managedUrls: [] },
      ],
      'deviceIdentifier',
    ),
    true,
  )
  assert.equal(
    permittedEverywhere(
      [
        { permissionBitmap: EVERYTHING, managedUrls: [] },
        {
          permissionBitmap: 0x2000 | (1 << 5),
          managedUrls: ['http://a.test/x/'],
        },
      ],
      'deviceIdentifier',
    ),
    false,
  )
  assert.equal(
    permittedEverywhere(
      [{ permissionBitmap: 0, managedUrls: [] }],
      'deviceIdentifier',
    ),
    false,
  )
})

test('the player hands the identifier over only when the whole boundary permits it', () => {
  const id = { caSystemId: 5, cardId: '0123456789AB' }

  assert.deepEqual(receiverIdHandedOver([], id), id)
  assert.deepEqual(
    receiverIdHandedOver(
      [{ permissionBitmap: EVERYTHING, managedUrls: [] }],
      id,
    ),
    id,
  )
  assert.equal(
    receiverIdHandedOver(
      [
        { permissionBitmap: EVERYTHING, managedUrls: ['http://a.test'] },
        { permissionBitmap: 0x2000 | (1 << 5), managedUrls: ['http://b.test'] },
      ],
      id,
    ),
    null,
  )
  assert.equal(receiverIdHandedOver([], null), null)
})
