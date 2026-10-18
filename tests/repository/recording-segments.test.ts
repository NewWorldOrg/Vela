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
  PUT: async (path: string, options?: Options) => {
    sent.push({
      method: 'PUT',
      path,
      id: options?.params?.path?.id,
      body: options?.body,
    })

    return answer({
      ...DETECTED,
      source: 'answered',
      state: 'answered',
      modelVersion: null,
      confirmed: options?.body?.confirmed,
      segments: options?.body?.segments,
    })
  },
  DELETE: async (path: string, options?: Options) => {
    sent.push({ method: 'DELETE', path, id: options?.params?.path?.id })

    return answer(DETECTED)
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

const {
  answerRecordingSegments,
  getRecordingSegments,
  noteSkip,
  withdrawSegmentAnswer,
} = await import('@/repository/recording-segments')

const ID = '0123456789abcdef0123456789abcdef'

const ANSWER = [
  { startsAtSec: 0, endsAtSec: 412.28, kind: 'programme' as const },
  { startsAtSec: 412.28, endsAtSec: 1804, kind: 'break' as const },
]

beforeEach(() => {
  sent.length = 0
  store.status = 200
  store.message = ''
  store.throwing = false
  store.segments = DETECTED
})

test('the stretches of a recording are read in numbers, with the version that found them', async () => {
  const read = await getRecordingSegments(ID)

  assert.deepEqual(sent, [
    { method: 'GET', path: '/api/recordings/{id}/segments', id: ID },
  ])
  assert.equal(read.state, 'ok')

  if (read.state !== 'ok') {
    return
  }

  assert.equal(read.value.lengthSec, 1804)
  assert.equal(read.value.source, 'detected')
  assert.equal(read.value.modelVersion, 3)
  assert.equal(read.value.confirmed, false)
  assert.deepEqual(read.value.snaps, [412.28, 502.3])
  assert.deepEqual(read.value.segments[1], {
    startsAtSec: 412.3,
    endsAtSec: 502.3,
    kind: 'break',
  })
})

test('a stretch of a kind this build has no word for is read as unknown', async () => {
  const read = await getRecordingSegments(ID)

  assert.equal(read.state === 'ok' && read.value.segments[3].kind, 'unknown')
})

test('a person’s answer names no version and a source this build does not know reads as none', async () => {
  store.segments = { ...DETECTED, source: 'guessed', modelVersion: null }

  const read = await getRecordingSegments(ID)

  assert.equal(read.state === 'ok' && read.value.source, 'none')
  assert.equal(read.state === 'ok' && read.value.modelVersion, undefined)
})

test('the stretches that cannot be read say so, and a lapsed session says that instead', async () => {
  store.status = 404

  assert.deepEqual(await getRecordingSegments(ID), { state: 'unavailable' })

  store.status = 401

  assert.deepEqual(await getRecordingSegments(ID), {
    state: 'unauthenticated',
  })

  store.throwing = true

  assert.deepEqual(await getRecordingSegments(ID), { state: 'unavailable' })
})

test('an answer is sent whole with whether it is confirmed, and what comes back replaces the stretches', async () => {
  const written = await answerRecordingSegments(ID, ANSWER, true)

  assert.deepEqual(sent, [
    {
      method: 'PUT',
      path: '/api/recordings/{id}/segments',
      id: ID,
      body: { segments: ANSWER, confirmed: true },
    },
  ])
  assert.equal(written.state, 'ok')
  assert.equal(written.state === 'ok' && written.segments.source, 'answered')
  assert.equal(written.state === 'ok' && written.segments.confirmed, true)
})

test('an answer refused is named by what is wrong with it', async () => {
  const said: [number, string, string][] = [
    [400, 'segments: a gap between segments', 'gap'],
    [400, 'segments: segments overlap', 'overlap'],
    [400, 'segments: outside the recording', 'outside'],
    [400, 'segments: unknown kind', 'unknownKind'],
    [400, 'segments: too many segments', 'tooMany'],
    [400, 'segments: a segment ends before it starts', 'endsBeforeStarts'],
    [400, 'confirmed: expected true to confirm', 'unanswered'],
    [409, 'Recording is still being written', 'stillRecording'],
    [404, 'There is no recording', 'gone'],
    [500, '', 'unanswered'],
  ]

  for (const [status, message, refusal] of said) {
    store.status = status
    store.message = message

    assert.deepEqual(
      await answerRecordingSegments(ID, ANSWER, false),
      { state: 'refused', refusal },
      message,
    )
  }
})

test('an answer that cannot reach the backend is refused, and a lapsed session says so', async () => {
  store.status = 401

  assert.deepEqual(await answerRecordingSegments(ID, ANSWER, false), {
    state: 'unauthenticated',
  })

  store.throwing = true

  assert.deepEqual(await answerRecordingSegments(ID, ANSWER, false), {
    state: 'refused',
    refusal: 'unanswered',
  })
})

test('withdrawing the answer goes back to the stretches the detection found', async () => {
  const withdrawn = await withdrawSegmentAnswer(ID)

  assert.deepEqual(sent, [
    { method: 'DELETE', path: '/api/recordings/{id}/segments/answer', id: ID },
  ])
  assert.equal(
    withdrawn.state === 'ok' && withdrawn.segments.source,
    'detected',
  )

  store.status = 404

  assert.deepEqual(await withdrawSegmentAnswer(ID), {
    state: 'refused',
    refusal: 'gone',
  })
})

test('a skip is sent in the recording’s own time, with no version for an answered recording', async () => {
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
