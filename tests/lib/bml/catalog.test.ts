import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  catalogOf,
  catalogPayload,
  readCatalog,
  type BmlCatalog,
} from '@/lib/bml/catalog'

const CATALOG: BmlCatalog = {
  service: 1024,
  entryTag: 0x40,
  autoStart: true,
  startup: '/40/0000/startup.bml',
  carousels: [
    {
      tag: 0x40,
      downloadId: 0x12345678,
      modules: [
        {
          id: 0,
          version: 2,
          size: 119_357,
          resources: [{ path: 'startup.bml', type: 'text/X-arib-bml' }],
        },
        { id: 1, version: 0, size: 300, resources: [] },
      ],
    },
    { tag: 0x72, downloadId: 0, modules: [] },
  ],
}

const ascii = (value: string) =>
  [...value].map((letter) => letter.charCodeAt(0))

const key = (value: string) => [0x60 + value.length, ...ascii(value)]

test('a catalog is the kind byte and a CBOR map, in the order Carina writes it', () => {
  const payload = catalogPayload({
    service: 1,
    entryTag: 0x40,
    autoStart: false,
    startup: 'a',
    carousels: [],
  })

  assert.deepEqual(
    [...payload],
    [
      0x01,
      0xa5,
      ...key('service'),
      0x01,
      ...key('entryTag'),
      0x18,
      0x40,
      ...key('autoStart'),
      0xf4,
      ...key('startup'),
      0x61,
      0x61,
      ...key('carousels'),
      0x80,
    ],
  )
})

test('a catalog reads back as it was written, lengths of every width included', () => {
  assert.deepEqual(readCatalog(catalogPayload(CATALOG)), CATALOG)
})

test('a key the catalog does not know is left out, so a later Carina can add one', () => {
  const payload = [
    0x01,
    0xa6,
    ...key('service'),
    0x02,
    ...key('entryTag'),
    0x18,
    0x40,
    ...key('autoStart'),
    0xf5,
    ...key('startup'),
    0x61,
    0x61,
    ...key('carousels'),
    0x80,
    ...key('later'),
    0xf6,
  ]

  assert.deepEqual(readCatalog(Uint8Array.from(payload)), {
    service: 2,
    entryTag: 0x40,
    autoStart: true,
    startup: 'a',
    carousels: [],
  })
})

test('a payload that is not a catalog, is cut short or runs on is not read', () => {
  const whole = catalogPayload(CATALOG)

  assert.equal(readCatalog(new Uint8Array([0x02, 0xa0])), null)
  assert.equal(readCatalog(new Uint8Array([0x01])), null)
  assert.equal(readCatalog(whole.subarray(0, whole.length - 1)), null)
  assert.equal(readCatalog(Uint8Array.from([...whole, 0x00])), null)
})

test('CBOR the side channel never writes is refused: indefinite lengths, byte strings, keys that are not text, floats', () => {
  assert.equal(readCatalog(new Uint8Array([0x01, 0xbf, 0xff])), null)
  assert.equal(readCatalog(new Uint8Array([0x01, 0x41, 0x00])), null)
  assert.equal(readCatalog(new Uint8Array([0x01, 0xa1, 0x01, 0x01])), null)
  assert.equal(
    readCatalog(new Uint8Array([0x01, 0xfb, 0, 0, 0, 0, 0, 0, 0, 0])),
    null,
  )
})

test('nesting past what a catalog needs is refused rather than followed', () => {
  const deep = [0x01, ...Array(64).fill(0x81), 0x00]

  assert.equal(readCatalog(Uint8Array.from(deep)), null)
})

test('a value of the wrong type anywhere makes it not a catalog', () => {
  assert.equal(catalogOf({ ...CATALOG, autoStart: 'yes' }), null)
  assert.equal(catalogOf({ ...CATALOG, entryTag: 256 }), null)
  assert.equal(catalogOf({ ...CATALOG, service: -1 }), null)
  assert.equal(catalogOf({ ...CATALOG, carousels: {} }), null)
  assert.equal(
    catalogOf({
      ...CATALOG,
      carousels: [{ tag: 0x40, downloadId: 1, modules: [{ id: 0 }] }],
    }),
    null,
  )
  assert.equal(
    catalogOf({
      ...CATALOG,
      carousels: [
        {
          tag: 0x40,
          downloadId: 1,
          modules: [
            { id: 0, version: 0, size: 0, resources: [{ path: 1, type: 'x' }] },
          ],
        },
      ],
    }),
    null,
  )
})
