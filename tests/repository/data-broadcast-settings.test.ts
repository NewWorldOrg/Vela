import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { beforeEach, mock, test } from 'node:test'

const NAVIGATION = 'next/navigation'

const STOOD_IN = 'vela-stand-in:next/navigation'

registerHooks({
  resolve(specifier, context, next) {
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

interface Sent {
  method: string
  path: string
  body?: Record<string, unknown>
}

const sent: Sent[] = []

const store: { status: number; throwing: boolean; data: unknown } = {
  status: 200,
  throwing: false,
  data: null,
}

const answered = (status: number) => ({ status, ok: status < 400 })

function answer(data: unknown) {
  if (store.throwing) {
    throw new Error('the API is not there')
  }

  if (store.status >= 400) {
    return {
      error: { status: false, message: 'refused', data: null },
      response: answered(store.status),
    }
  }

  return {
    data: { status: true, message: '', data },
    response: answered(store.status),
  }
}

const client = () => ({
  GET: async (path: string) => {
    sent.push({ method: 'GET', path })

    return answer(store.data)
  },
  PUT: async (path: string, options?: { body?: Record<string, unknown> }) => {
    sent.push({ method: 'PUT', path, body: options?.body })

    return answer({ ...options?.body, changedAt: '2026-10-23T12:00:00Z' })
  },
})

mock.module('@/repository/client/carina', {
  namedExports: { carinaClient: client, revalidatingCarinaClient: client },
})

const { getResidence, settleResidence } =
  await import('@/repository/data-broadcast-settings')

beforeEach(() => {
  sent.length = 0
  store.status = 200
  store.throwing = false
  store.data = null
})

test('the residence registered is read, and one not registered reads as two nulls', async () => {
  store.data = { postalCode: '0000000', prefecture: 48, changedAt: null }

  assert.deepEqual(await getResidence(), {
    state: 'ok',
    value: { postalCode: '0000000', prefecture: 48 },
  })

  store.data = { postalCode: null, prefecture: null, changedAt: null }

  assert.deepEqual(await getResidence(), {
    state: 'ok',
    value: { postalCode: null, prefecture: null },
  })
  assert.deepEqual(
    sent.map(({ method, path }) => `${method} ${path}`),
    ['GET /api/data-broadcast/settings', 'GET /api/data-broadcast/settings'],
  )
})

test('a residence that cannot be read says whether it was the session', async () => {
  store.status = 401

  assert.deepEqual(await getResidence(), { state: 'unauthenticated' })

  store.status = 500

  assert.deepEqual(await getResidence(), { state: 'unavailable' })

  store.status = 200
  store.data = { postalCode: 'somewhere', prefecture: null }

  assert.deepEqual(await getResidence(), { state: 'unavailable' })

  store.throwing = true

  assert.deepEqual(await getResidence(), { state: 'unavailable' })
})

test('the postal code and the prefecture are sent together, a null for one not registered', async () => {
  assert.deepEqual(
    await settleResidence({ postalCode: '0000000', prefecture: null }),
    { state: 'ok' },
  )
  assert.deepEqual(sent, [
    {
      method: 'PUT',
      path: '/api/data-broadcast/settings',
      body: { postalCode: '0000000', prefecture: null },
    },
  ])
})

test('a residence Carina refuses says whether it was the values or the session', async () => {
  const residence = { postalCode: '0000000', prefecture: 13 }

  store.status = 400

  assert.deepEqual(await settleResidence(residence), { state: 'invalid' })

  store.status = 401

  assert.deepEqual(await settleResidence(residence), {
    state: 'unauthenticated',
  })

  store.status = 500

  assert.deepEqual(await settleResidence(residence), { state: 'notSaved' })

  store.status = 200
  store.throwing = true

  assert.deepEqual(await settleResidence(residence), { state: 'notSaved' })
})
