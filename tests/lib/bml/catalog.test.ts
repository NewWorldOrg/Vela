import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  catalogOf,
  catalogPayload,
  listedVersion,
  readCatalog,
  staysListed,
  takesThePlace,
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

test('a top-level item that is not a map is not a catalog, whatever kind it is', () => {
  assert.equal(readCatalog(new Uint8Array([0x01, 0x41, 0x00])), null)
  assert.equal(readCatalog(new Uint8Array([0x01, 0x20])), null)
  assert.equal(
    readCatalog(new Uint8Array([0x01, 0xfb, 0, 0, 0, 0, 0, 0, 0, 0])),
    null,
  )
  assert.equal(readCatalog(new Uint8Array([0x01, 0xa1, 0x01, 0x01])), null)
  assert.equal(readCatalog(new Uint8Array([0x01, 0xbf, 0xff])), null)
})

const KNOWN = [
  ...key('service'),
  0x02,
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
]

const READ = {
  service: 2,
  entryTag: 0x40,
  autoStart: false,
  startup: 'a',
  carousels: [],
}

test('a key the catalog does not know is passed over whatever kind of value it holds', () => {
  const unknown: [string, number[]][] = [
    ['a negative integer', [0x38, 0x63]],
    [
      'a 64-bit integer past what is safe',
      [0x1b, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff],
    ],
    ['a byte string', [0x43, 1, 2, 3]],
    ['a half float', [0xf9, 0x3c, 0x00]],
    ['a single float', [0xfa, 0x3f, 0xc0, 0x00, 0x00]],
    ['a double float', [0xfb, 0x40, 0x09, 0x21, 0xfb, 0x54, 0x44, 0x2d, 0x18]],
    ['a tag', [0xc1, 0x1a, 0x5a, 0x00, 0x00, 0x00]],
    ['undefined and a one-byte simple value', [0x82, 0xf7, 0xf8, 0x20]],
    ['a map keyed by integers', [0xa2, 0x01, 0x02, 0x20, 0x41, 0x00]],
    ['an indefinite array', [0x9f, 0x01, 0x9f, 0xff, 0xff]],
    ['an indefinite map', [0xbf, 0x61, 0x78, 0x01, 0x01, 0x02, 0xff]],
    [
      'an indefinite text in chunks',
      [0x7f, 0x61, 0x61, 0x62, 0x62, 0x62, 0xff],
    ],
    ['an indefinite byte string in chunks', [0x5f, 0x41, 0x01, 0x40, 0xff]],
    ['twelve levels of nesting', [...Array(12).fill(0x81), 0x00]],
  ]

  for (const [kind, value] of unknown) {
    const payload = Uint8Array.from([
      0x01,
      0xa6,
      ...KNOWN,
      ...key('later'),
      ...value,
    ])

    assert.deepEqual(readCatalog(payload), READ, kind)
  }
})

test('what is not CBOR at all is refused: reserved codes, a break out of place, chunks of another kind', () => {
  const broken: [string, number[]][] = [
    ['a reserved length', [0x1c]],
    ['a reserved simple code', [0xfc]],
    ['a break with nothing to end', [0xff]],
    ['an indefinite integer', [0x1f]],
    ['a text chunk inside a byte string', [0x5f, 0x61, 0x61, 0xff]],
    ['a text that is not UTF-8', [0x61, 0xff]],
    ['an indefinite array never ended', [0x9f, 0x01]],
  ]

  for (const [kind, value] of broken) {
    const payload = Uint8Array.from([
      0x01,
      0xa6,
      ...KNOWN,
      ...key('later'),
      ...value,
    ])

    assert.equal(readCatalog(payload), null, kind)
  }
})

test('nesting past sixteen levels is refused rather than followed', () => {
  const deep = [0x01, ...Array(17).fill(0x81), 0x00]

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

test('the version listed for a module is read from any carousel of its tag, and none for a module not listed', () => {
  assert.equal(listedVersion(CATALOG, 0x40, 0), 2)
  assert.equal(listedVersion(CATALOG, 0x40, 1), 0)
  assert.equal(listedVersion(CATALOG, 0x40, 9), undefined)
  assert.equal(listedVersion(CATALOG, 0x72, 0), undefined)
  assert.equal(listedVersion(null, 0x40, 0), undefined)
  assert.equal(staysListed(CATALOG, 0x40, 0), true)
  assert.equal(staysListed(CATALOG, 0x41, 0), false)
})

test('a module that comes takes the place of the one held unless the one held is already the version listed', () => {
  const came = (version: number) => ({ tag: 0x40, id: 0, version })

  assert.equal(takesThePlace(CATALOG, undefined, came(1)), true)
  assert.equal(takesThePlace(CATALOG, { version: 1 }, came(2)), true)
  assert.equal(takesThePlace(CATALOG, { version: 1 }, came(3)), true)
  assert.equal(takesThePlace(CATALOG, { version: 2 }, came(1)), false)
  assert.equal(takesThePlace(CATALOG, { version: 2 }, came(2)), true)
  assert.equal(takesThePlace(null, { version: 2 }, came(1)), true)
  assert.equal(
    takesThePlace(CATALOG, { version: 2 }, { tag: 0x40, id: 9, version: 1 }),
    true,
  )
})
