import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

/**
 * The search, with the API standing in for itself.
 *
 * Only the module that reaches the network is replaced; everything between it
 * and the screen — reading the address, turning services into channels, turning
 * programmes into hits — is the real thing, which is the point. The two calls
 * this makes are recorded, so what the store was asked for can be read as well
 * as what came back.
 */

interface Asked {
  path: string
  query: Record<string, unknown>
}

const asked: Asked[] = []

/** What the fake store holds, set by each test before it asks. */
const store: {
  services: unknown[]
  refuses: boolean
} = { services: [], refuses: false }

const television = (
  networkId: number,
  serviceId: number,
  name: string,
  system: string,
  remoteControlKeyId?: number,
) => ({
  networkId,
  serviceId,
  name,
  category: 'television',
  remoteControlKeyId: remoteControlKeyId ?? null,
  selectedChannel: { system },
  candidates: [],
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

        return {
          data: {
            data: {
              items: [],
              total: 0,
              currentPage: 1,
              lastPage: 1,
              perPage: 20,
            },
          },
          response: { status: 200 },
        }
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
  store.services = [
    television(131, 1310, '中央テレビ1', 'isdbT', 1),
    television(4, 1032, 'BS みなと', 'isdbSBs'),
    television(6, 1048, 'BS 湾岸', 'isdbSBs'),
    television(161, 1610, '東都テレビ1', 'isdbT', 6),
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

test('the type that was asked for still reaches the store', async () => {
  standing()

  await searchPrograms({ q: '観測所', type: 'bs' })

  assert.equal(askedTheStore()?.query.type, 'isdbSBs')
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

test('a condition the store answers comes back as a result', async () => {
  standing()

  const result = await searchPrograms({ q: '観測所' })

  assert.equal(result.outcome.state, 'searched')
})
