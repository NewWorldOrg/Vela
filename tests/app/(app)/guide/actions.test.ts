import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { beforeEach, mock, test } from 'node:test'

import type { WatchDraft } from '@/lib/notifications'

const CACHE = 'next/cache'

registerHooks({
  resolve(specifier, context, next) {
    return next(specifier === CACHE ? `${CACHE}.js` : specifier, context)
  },
})

const DOCUMENTARY = '32736-1024-501'
const WATCH = '0c000000-0000-4000-8000-000000000001'
const HOME = '0a000000-0000-4000-8000-000000000001'

const store: { status: number } = { status: 200 }

const revalidated: string[] = []

const answered = () => ({ status: store.status, ok: store.status < 400 })

const client = () => ({
  GET: async () => ({
    data: {
      data: {
        id: DOCUMENTARY,
        networkId: 32736,
        serviceId: 1024,
        eventId: 501,
        startsAt: '2030-01-02T12:00:00Z',
        endsAt: '2030-01-02T12:50:00Z',
        isShadow: false,
        sounds: 1,
      },
    },
    response: { status: 200, ok: true },
  }),
  POST: async () => ({
    data:
      store.status < 400 ? { data: { id: WATCH, leadMinutes: 5 } } : undefined,
    response: answered(),
  }),
  DELETE: async () => ({ response: answered() }),
})

mock.module('@/repository/client/carina', {
  namedExports: { carinaClient: client, revalidatingCarinaClient: client },
})

mock.module(CACHE, {
  namedExports: {
    revalidatePath: (path: string) => {
      revalidated.push(path)
    },
  },
})

const { unwatchProgramme, watchProgramme } =
  await import('@/app/(app)/guide/actions')

const DRAFT: WatchDraft = { leadMinutes: 5, destinations: [HOME] }

beforeEach(() => {
  revalidated.length = 0
  store.status = 200
})

test('a single notice that was set reads the guide and the reservations again', async () => {
  store.status = 201

  assert.deepEqual(await watchProgramme(DOCUMENTARY, DRAFT), {
    state: 'ok',
    watch: { id: WATCH, leadMinutes: 5 },
  })
  assert.deepEqual(revalidated, ['/guide', '/reservations'])
})

test('a single notice that was refused reads them again too, since what refused it may show there', async () => {
  store.status = 409

  const result = await watchProgramme(DOCUMENTARY, DRAFT)

  assert.equal(result.state, 'rejected')
  assert.deepEqual(revalidated, ['/guide', '/reservations'])
})

test('taking a single notice back reads the guide and the reservations again', async () => {
  assert.deepEqual(await unwatchProgramme(WATCH), { state: 'ok' })
  assert.deepEqual(revalidated, ['/guide', '/reservations'])
})

test('a session that ended is said as such', async () => {
  store.status = 401

  assert.deepEqual(await unwatchProgramme(WATCH), { state: 'unauthenticated' })
})
