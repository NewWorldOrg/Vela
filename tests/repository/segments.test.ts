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

const store: { status: number; throwing: boolean } = {
  status: 200,
  throwing: false,
}

const SETTINGS = { skipThreshold: 0.7, skipThresholdChangedAt: null }

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
  PATCH: async (path: string, options?: { body?: Record<string, unknown> }) => {
    sent.push({ method: 'PATCH', path, body: options?.body })

    return answer({ ...SETTINGS, ...options?.body })
  },
})

mock.module('@/repository/client/carina', {
  namedExports: { carinaClient: client, revalidatingCarinaClient: client },
})

const {
  chooseSegmentVersion,
  leaveSegmentVersionToLearning,
  settleSkipThreshold,
} = await import('@/repository/segments')

beforeEach(() => {
  sent.length = 0
  store.status = 200
  store.throwing = false
})

test('the threshold of the skip button is sent alone, as the value given', async () => {
  assert.deepEqual(await settleSkipThreshold(0.65), { state: 'ok' })
  assert.deepEqual(sent, [
    {
      method: 'PATCH',
      path: '/api/segments/settings',
      body: { skipThreshold: 0.65 },
    },
  ])
})

test('a threshold the API refuses says whether it was the range or the session', async () => {
  store.status = 400

  assert.deepEqual(await settleSkipThreshold(0.97), { state: 'outOfRange' })

  store.status = 401

  assert.deepEqual(await settleSkipThreshold(0.7), {
    state: 'unauthenticated',
  })

  store.status = 500

  assert.deepEqual(await settleSkipThreshold(0.7), { state: 'notSaved' })

  store.status = 200
  store.throwing = true

  assert.deepEqual(await settleSkipThreshold(0.7), { state: 'notSaved' })
})

test('choosing a version names its number, and leaving it to learning says only that', async () => {
  assert.deepEqual(await chooseSegmentVersion(2), { state: 'ok' })
  assert.deepEqual(await leaveSegmentVersionToLearning(), { state: 'ok' })
  assert.deepEqual(sent, [
    { method: 'PATCH', path: '/api/segments/version', body: { number: 2 } },
    {
      method: 'PATCH',
      path: '/api/segments/version',
      body: { byHand: false },
    },
  ])
})

test('a version change refused while learning is off says so, apart from the rest', async () => {
  store.status = 409

  assert.deepEqual(await chooseSegmentVersion(2), { state: 'learningOff' })
  assert.deepEqual(await leaveSegmentVersionToLearning(), {
    state: 'learningOff',
  })

  store.status = 401

  assert.deepEqual(await chooseSegmentVersion(2), {
    state: 'unauthenticated',
  })

  for (const status of [400, 404, 500]) {
    store.status = status

    assert.deepEqual(await chooseSegmentVersion(9), { state: 'notSaved' })
  }

  store.status = 200
  store.throwing = true

  assert.deepEqual(await leaveSegmentVersionToLearning(), {
    state: 'notSaved',
  })
})
