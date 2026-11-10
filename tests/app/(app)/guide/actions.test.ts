import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { beforeEach, mock, test } from 'node:test'

import type { WatchDraft } from '@/lib/notifications'

const NAVIGATION = 'next/navigation'

const STOOD_IN = 'vela-stand-in:next/navigation'

const CACHE = 'next/cache'

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === CACHE) {
      return next(`${CACHE}.js`, context)
    }

    return specifier === NAVIGATION
      ? { url: STOOD_IN, shortCircuit: true }
      : next(specifier, context)
  },
  load(url, context, next) {
    return url === STOOD_IN
      ? {
          format: 'module',
          source: 'export const unstable_rethrow = () => {}',
          shortCircuit: true,
        }
      : next(url, context)
  },
})

const DOCUMENTARY = '32736-1024-501'
const WATCH = '0c000000-0000-4000-8000-000000000001'
const HOME = '0a000000-0000-4000-8000-000000000001'

const store: { status: number; down: boolean } = { status: 200, down: false }

const revalidated: string[] = []

const answered = () => ({ status: store.status, ok: store.status < 400 })

function reach(): void {
  if (store.down) {
    throw new Error('the API is not there')
  }
}

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
  POST: async () => {
    reach()

    return {
      data:
        store.status < 400
          ? { data: { id: WATCH, leadMinutes: 5 } }
          : undefined,
      response: answered(),
    }
  },
  DELETE: async () => {
    reach()

    return { response: answered() }
  },
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
  store.down = false
})

test('a single notice that was set reads the guide, the reservations and the search again', async () => {
  store.status = 201

  assert.deepEqual(await watchProgramme(DOCUMENTARY, DRAFT), {
    state: 'ok',
    watch: { id: WATCH, leadMinutes: 5 },
  })
  assert.deepEqual(revalidated, ['/guide', '/reservations', '/search'])
})

test('a single notice that was refused reads them again too, since what refused it may show there', async () => {
  store.status = 409

  const result = await watchProgramme(DOCUMENTARY, DRAFT)

  assert.equal(result.state, 'rejected')
  assert.deepEqual(revalidated, ['/guide', '/reservations', '/search'])
})

test('taking a single notice back reads the guide, the reservations and the search again', async () => {
  assert.deepEqual(await unwatchProgramme(WATCH), { state: 'ok' })
  assert.deepEqual(revalidated, ['/guide', '/reservations', '/search'])
})

test('a session that ended is said as such', async () => {
  store.status = 401

  assert.deepEqual(await unwatchProgramme(WATCH), { state: 'unauthenticated' })
})

test('a single notice whose asking or taking back never reached the API leaves the pages as they are', async () => {
  store.down = true

  assert.deepEqual(await watchProgramme(DOCUMENTARY, DRAFT), {
    state: 'rejected',
    message:
      '通知を設定できませんでした。時間をおいてからもう一度お試しください。',
    unreached: true,
  })
  assert.deepEqual(await unwatchProgramme(WATCH), {
    state: 'rejected',
    message:
      '通知を取り消せませんでした。時間をおいてからもう一度お試しください。',
    unreached: true,
  })
  assert.deepEqual(revalidated, [])
})
