import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

/**
 * The search, with the API standing in for itself.
 *
 * Only the module that reaches the network is replaced; everything between it
 * and the screen — reading the address, turning services into channels, turning
 * programmes into rows — is the real thing, which is the point. The two calls
 * this makes are recorded, so what the store was asked for can be read as well
 * as what came back.
 */

interface Asked {
  path: string
  query: Record<string, unknown>
}

interface StorePage {
  items: unknown[]
  total: number
  currentPage: number
  lastPage: number
  perPage: number
}

const asked: Asked[] = []

/** What the fake store holds, set by each test before it asks. */
const store: {
  services: unknown[]
  page: StorePage
  refuses: boolean
} = {
  services: [],
  page: { items: [], total: 0, currentPage: 1, lastPage: 1, perPage: 20 },
  refuses: false,
}

const service = (
  networkId: number,
  serviceId: number,
  name: string,
  system: string,
  category: string,
  remoteControlKeyId?: number,
) => ({
  networkId,
  serviceId,
  name,
  category,
  remoteControlKeyId: remoteControlKeyId ?? null,
  selectedChannel: { system },
  candidates: [],
})

const programme = (
  networkId: number,
  serviceId: number,
  eventId: number,
  name: string,
  startsAt: string,
  rest: { endsAt?: string; summary?: string; genreKind?: number } = {},
) => ({
  id: `${networkId}-${serviceId}-${eventId}`,
  networkId,
  serviceId,
  eventId,
  startsAt,
  endsAt: rest.endsAt ?? null,
  name,
  summary: rest.summary ?? '',
  isShadow: false,
  hasSubtitles: false,
  isArchived: false,
  genres: rest.genreKind == null ? [] : [{ kind: rest.genreKind, sort: 0 }],
  items: [],
  related: [],
})

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({
      GET: async (
        path: string,
        init?: { params?: { query?: Record<string, unknown> } },
      ) => {
        asked.push({ path, query: init?.params?.query ?? {} })

        if (path === '/api/services') {
          return { data: { data: store.services }, response: { status: 200 } }
        }

        if (store.refuses) {
          return { data: undefined, response: { status: 400 } }
        }

        return { data: { data: store.page }, response: { status: 200 } }
      },
    }),
    revalidatingCarinaClient: () => {
      throw new Error('the search does not revalidate')
    },
  },
})

const { searchPrograms } = await import('./search.ts')

function standing(): void {
  asked.length = 0
  store.refuses = false
  store.page = { items: [], total: 0, currentPage: 1, lastPage: 1, perPage: 20 }
  store.services = [
    service(131, 1310, '中央テレビ1', 'isdbT', 'television', 1),
    service(4, 1032, 'BS みなと', 'isdbSBs', 'television'),
    service(4, 1040, 'BS 湾岸', 'isdbSBs', 'television'),
    service(161, 1610, '東都テレビ1', 'isdbT', 'television', 6),
    /*
      Not a channel a programme guide has rows for. The store carries every
      service it can tune, sound-only ones included, so leaving them in would
      put stations with no programme table in the チャンネル list.
    */
    service(131, 2310, 'ラジオ第一', 'isdbT', 'radio'),
  ]
}

const askedTheStore = (): Asked | undefined =>
  asked.find((one) => one.path === '/api/programs/search')

/**
 * The channels a screen may offer are every television service there is,
 * whatever broadcast type the address asks for. The type is a condition the
 * reader assembles before asking, so widening it back has to offer what the
 * narrower answer left out — and a list already cut down to the narrower answer
 * has nothing to widen to.
 */
test('the channels on offer are not cut down to the type that was asked for', async () => {
  standing()

  const result = await searchPrograms({ q: '観測所', type: 'bs' })

  assert.deepEqual(
    result.channels.map((channel) => channel.name),
    ['中央テレビ1', '東都テレビ1', 'BS みなと', 'BS 湾岸'],
  )
})

test('the same channels come whether a type was asked for or not', async () => {
  standing()
  const withType = await searchPrograms({ q: '観測所', type: 'terrestrial' })

  standing()
  const withNone = await searchPrograms({ q: '観測所' })

  assert.deepEqual(
    withType.channels.map((channel) => channel.id),
    withNone.channels.map((channel) => channel.id),
  )
})

test('a service that carries no picture is not a channel to search', async () => {
  standing()

  const result = await searchPrograms({ q: '観測所' })

  assert.deepEqual(
    result.channels.filter((channel) => channel.name === 'ラジオ第一'),
    [],
  )
  assert.equal(result.channels.length, 4)
})

test('the type that was asked for still reaches the store', async () => {
  standing()

  await searchPrograms({ q: '観測所', type: 'bs' })

  assert.equal(askedTheStore()?.query.type, 'IsdbSBs')
})

test('a condition that narrows nothing never reaches the store', async () => {
  standing()

  const result = await searchPrograms({ fields: 'title', sort: 'name.asc' })

  assert.equal(result.outcome.state, 'idle')
  assert.equal(askedTheStore(), undefined)
  assert.equal(result.channels.length, 4)
})

test('a condition the store turns away is turned away to the reader', async () => {
  standing()
  store.refuses = true

  const result = await searchPrograms({ q: 'あ' })

  assert.equal(result.outcome.state, 'refused')
})

/**
 * What comes back is spelled for the screen: the channel by the name it is
 * known by, the times in `Asia/Tokyo`, the genre by its label. The second
 * programme is the awkward one — a channel the services call does not know, an
 * end the broadcaster has not said, no genre, nothing written about it, and a
 * start that is the small hours of the next day in Tokyo.
 */
test('a programme comes back spelled the way the screen shows it', async () => {
  standing()
  store.page = {
    items: [
      programme(
        131,
        1310,
        40001,
        '空から見る港町の夏',
        '2026-08-09T10:30:00Z',
        {
          endsAt: '2026-08-09T11:15:00Z',
          summary: '上空からたどる岬と灯台',
          genreKind: 8,
        },
      ),
      programme(999, 9990, 40002, '真夜中の水槽通信', '2026-08-09T15:00:00Z'),
    ],
    total: 2,
    currentPage: 1,
    lastPage: 1,
    perPage: 20,
  }

  const result = await searchPrograms({ q: '観測所' })

  assert.equal(result.outcome.state, 'searched')
  assert.deepEqual(
    result.outcome.state === 'searched' ? result.outcome.found.hits : [],
    [
      {
        id: '131-1310-40001',
        channelName: '中央テレビ1',
        channelNo: '1',
        dayLabel: '8/9(日)',
        startLabel: '19:30',
        endLabel: '20:15',
        endUndecided: false,
        title: '空から見る港町の夏',
        description: '上空からたどる岬と灯台',
        genre: 'doc',
        genreLabel: 'ドキュメンタリー/教養',
      },
      {
        id: '999-9990-40002',
        channelName: '999-9990',
        channelNo: undefined,
        dayLabel: '8/10(月)',
        startLabel: '00:00',
        endLabel: undefined,
        endUndecided: true,
        title: '真夜中の水槽通信',
        description: undefined,
        genre: 'other',
        genreLabel: 'その他',
      },
    ],
  )
})

test('a page in the middle says which of the whole it is holding', async () => {
  standing()
  store.page = {
    items: [programme(131, 1310, 40003, '渓谷さんぽ', '2026-08-10T09:00:00Z')],
    total: 45,
    currentPage: 2,
    lastPage: 3,
    perPage: 20,
  }

  const result = await searchPrograms({ q: '観測所', page: '2' })

  assert.deepEqual(
    result.outcome.state === 'searched'
      ? {
          ...result.outcome.found,
          hits: result.outcome.found.hits.length,
        }
      : null,
    {
      hits: 1,
      total: 45,
      page: 2,
      lastPage: 3,
      perPage: 20,
      rangeFrom: 21,
      rangeTo: 40,
    },
  )
})

test('the last page stops at the last programme, not at the page it fills', async () => {
  standing()
  store.page = {
    items: [programme(131, 1310, 40004, '夏の吊り橋', '2026-08-10T09:00:00Z')],
    total: 41,
    currentPage: 3,
    lastPage: 3,
    perPage: 20,
  }

  const result = await searchPrograms({ q: '観測所', page: '3' })

  assert.deepEqual(
    result.outcome.state === 'searched'
      ? [result.outcome.found.rangeFrom, result.outcome.found.rangeTo]
      : null,
    [41, 41],
  )
})

test('a search that found nothing holds no range at all', async () => {
  standing()

  const result = await searchPrograms({ q: '観測所' })

  assert.deepEqual(
    result.outcome.state === 'searched'
      ? [result.outcome.found.rangeFrom, result.outcome.found.rangeTo]
      : null,
    [0, 0],
  )
})
