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

const store: {
  settings: unknown
  status: number
  throwing: boolean
} = { settings: null, status: 200, throwing: false }

const SETTINGS = { learning: false, learningChangedAt: null }

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

    return answer(store.settings)
  },
  PATCH: async (path: string, options?: { body?: Record<string, unknown> }) => {
    sent.push({ method: 'PATCH', path, body: options?.body })

    return answer({ ...SETTINGS, ...options?.body })
  },
})

mock.module('@/repository/client/carina', {
  namedExports: { carinaClient: client, revalidatingCarinaClient: client },
})

const { getSegmentSettings, settleLearning } =
  await import('@/repository/segments')

beforeEach(() => {
  sent.length = 0
  store.settings = SETTINGS
  store.status = 200
  store.throwing = false
})

test('the learning setting is read as the API answers it', async () => {
  assert.deepEqual(await getSegmentSettings(), {
    state: 'ok',
    value: { learning: false },
  })
  assert.deepEqual(sent, [{ method: 'GET', path: '/api/segments/settings' }])

  store.settings = {
    learning: true,
    learningChangedAt: '2026-10-07T03:12:45.118204Z',
  }

  assert.deepEqual(await getSegmentSettings(), {
    state: 'ok',
    value: { learning: true },
  })
})

test('a setting the API cannot be asked for, or answers without, is unread', async () => {
  store.throwing = true

  assert.deepEqual(await getSegmentSettings(), { state: 'unavailable' })

  store.throwing = false
  store.settings = null

  assert.deepEqual(await getSegmentSettings(), { state: 'unavailable' })

  store.settings = SETTINGS
  store.status = 500

  assert.deepEqual(await getSegmentSettings(), { state: 'unavailable' })
})

test('a setting read without a session says so', async () => {
  store.status = 401

  assert.deepEqual(await getSegmentSettings(), { state: 'unauthenticated' })
})

test('settling the learning sends that one value', async () => {
  assert.deepEqual(await settleLearning(true), { state: 'ok' })
  assert.deepEqual(sent, [
    {
      method: 'PATCH',
      path: '/api/segments/settings',
      body: { learning: true },
    },
  ])

  assert.deepEqual(await settleLearning(false), { state: 'ok' })
  assert.deepEqual(sent[1].body, { learning: false })
})

test('a change the API refuses, or never hears, is not saved', async () => {
  for (const status of [400, 401, 500]) {
    store.status = status

    assert.deepEqual(await settleLearning(true), { state: 'notSaved' })
  }

  store.status = 200
  store.throwing = true

  assert.deepEqual(await settleLearning(true), { state: 'notSaved' })
})
