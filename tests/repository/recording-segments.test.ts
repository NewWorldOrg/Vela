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
  id?: string
  body?: Record<string, unknown>
}

const sent: Sent[] = []

const store: {
  status: number
  message: string
  throwing: boolean
  segments: unknown
} = { status: 200, message: '', throwing: false, segments: null }

const DETECTED = {
  lengthSec: '1804.00',
  source: 'detected',
  state: 'marked',
  modelVersion: '3',
  confirmed: false,
  answeredAt: null,
  detectedAt: '2026-10-18T03:02:00Z',
  cmShare: 0.1,
  segments: [
    { startsAtSec: 0, endsAtSec: 412.3, kind: 'programme', probability: 0.98 },
    { startsAtSec: 412.3, endsAtSec: 502.3, kind: 'break', probability: 0.93 },
    {
      startsAtSec: 502.3,
      endsAtSec: 1680,
      kind: 'programme',
      probability: 0.99,
    },
    { startsAtSec: 1680, endsAtSec: 1804, kind: 'ending', probability: 0.8 },
  ],
  snaps: [412.28, '502.30'],
}

const answered = (status: number) => ({ status, ok: status < 400 })

function answer(data: unknown) {
  if (store.throwing) {
    throw new Error('the API is not there')
  }

  if (store.status >= 400) {
    return {
      error:
        store.status === 401
          ? undefined
          : { status: false, message: store.message, data: null },
      response: answered(store.status),
    }
  }

  return {
    data: { status: true, message: '', data },
    response: answered(store.status),
  }
}

type Options = {
  params?: { path?: { id?: string } }
  body?: Record<string, unknown>
}

const client = () => ({
  GET: async (path: string, options?: Options) => {
    sent.push({ method: 'GET', path, id: options?.params?.path?.id })

    return answer(store.segments)
  },
  POST: async (path: string, options?: Options) => {
    sent.push({
      method: 'POST',
      path,
      id: options?.params?.path?.id,
      body: options?.body,
    })

    return answer({ happenedAt: '2026-10-19T00:00:00Z', ...options?.body })
  },
})

mock.module('@/repository/client/carina', {
  namedExports: { carinaClient: client, revalidatingCarinaClient: client },
})

const { getSegmentModelVersion, noteSkip } =
  await import('@/repository/recording-segments')

const ID = '0123456789abcdef0123456789abcdef'

beforeEach(() => {
  sent.length = 0
  store.status = 200
  store.message = ''
  store.throwing = false
  store.segments = DETECTED
})

test('the version of the model that found the stretches of a recording is read as a number', async () => {
  const read = await getSegmentModelVersion(ID)

  assert.deepEqual(sent, [
    { method: 'GET', path: '/api/recordings/{id}/segments', id: ID },
  ])
  assert.deepEqual(read, { state: 'ok', value: 3 })
})

test('a recording no model found the stretches of reads no version', async () => {
  for (const modelVersion of [null, 'none']) {
    store.segments = { ...DETECTED, source: 'none', modelVersion }

    assert.deepEqual(await getSegmentModelVersion(ID), {
      state: 'ok',
      value: undefined,
    })
  }
})

test('the stretches that cannot be read say so, and a lapsed session says that instead', async () => {
  store.status = 404

  assert.deepEqual(await getSegmentModelVersion(ID), { state: 'unavailable' })

  store.status = 401

  assert.deepEqual(await getSegmentModelVersion(ID), {
    state: 'unauthenticated',
  })

  store.throwing = true

  assert.deepEqual(await getSegmentModelVersion(ID), { state: 'unavailable' })
})

test('a skip is sent in the recording’s own time, with no version when no model found the stretches', async () => {
  assert.deepEqual(
    await noteSkip(ID, {
      event: 'returned',
      kind: 'break',
      fromSec: 514.2,
      toSec: 430,
    }),
    { state: 'ok' },
  )
  assert.deepEqual(sent.at(-1), {
    method: 'POST',
    path: '/api/recordings/{id}/skips',
    id: ID,
    body: {
      event: 'returned',
      kind: 'break',
      fromSec: 514.2,
      toSec: 430,
      modelVersion: null,
    },
  })
})

test('a skip turned away for too many is told apart from one refused', async () => {
  const skip = {
    event: 'skipped' as const,
    kind: 'break' as const,
    fromSec: 415,
    toSec: 502.3,
    modelVersion: 3,
  }

  store.status = 429
  assert.deepEqual(await noteSkip(ID, skip), { state: 'tooMany' })

  store.status = 400
  assert.deepEqual(await noteSkip(ID, skip), { state: 'refused' })

  store.status = 401
  assert.deepEqual(await noteSkip(ID, skip), { state: 'unauthenticated' })

  store.throwing = true
  assert.deepEqual(await noteSkip(ID, skip), { state: 'refused' })
})
