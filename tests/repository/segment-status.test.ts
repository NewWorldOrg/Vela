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

const asked: string[] = []

const store: {
  status: unknown
  httpStatus: number
  throwing: boolean
} = { status: null, httpStatus: 200, throwing: false }

const LEARNING_DATA = {
  recordings: 3,
  seconds: 5400,
  bytes: 5000000123,
  waiting: 12,
}

const answered = (status: number) => ({ status, ok: status < 400 })

const client = () => ({
  GET: async (path: string) => {
    asked.push(path)

    if (store.throwing) {
      throw new Error('the API is not there')
    }

    if (store.httpStatus >= 400) {
      return {
        error: { status: false, message: '', data: null },
        response: answered(store.httpStatus),
      }
    }

    return {
      data: { status: true, message: '', data: store.status },
      response: answered(store.httpStatus),
    }
  },
})

mock.module('@/repository/client/carina', {
  namedExports: { carinaClient: client, revalidatingCarinaClient: client },
})

const { getSegmentStatus } = await import('@/repository/segment-status')

beforeEach(() => {
  asked.length = 0
  store.status = { learningData: LEARNING_DATA }
  store.httpStatus = 200
  store.throwing = false
})

test('the learning data is read as the API answers it', async () => {
  assert.deepEqual(await getSegmentStatus(), {
    state: 'ok',
    value: {
      learningData: {
        recordings: 3,
        seconds: 5400,
        bytes: 5000000123,
        waiting: 12,
      },
    },
  })
  assert.deepEqual(asked, ['/api/segments/status'])
})

test('a count the API spells as a string is read as a number', async () => {
  store.status = {
    learningData: {
      recordings: '312',
      seconds: '674100',
      bytes: '450887680',
      waiting: '0',
    },
  }

  assert.deepEqual(await getSegmentStatus(), {
    state: 'ok',
    value: {
      learningData: {
        recordings: 312,
        seconds: 674100,
        bytes: 450887680,
        waiting: 0,
      },
    },
  })
})

test('a status the API cannot be asked for, or answers without, is unread', async () => {
  store.throwing = true

  assert.deepEqual(await getSegmentStatus(), { state: 'unavailable' })

  store.throwing = false
  store.status = null

  assert.deepEqual(await getSegmentStatus(), { state: 'unavailable' })

  store.status = { learningData: LEARNING_DATA }
  store.httpStatus = 500

  assert.deepEqual(await getSegmentStatus(), { state: 'unavailable' })
})

test('a status read without a session says so', async () => {
  store.httpStatus = 401

  assert.deepEqual(await getSegmentStatus(), { state: 'unauthenticated' })
})
