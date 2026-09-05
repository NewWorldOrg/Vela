import assert from 'node:assert/strict'
import { beforeEach, mock, test } from 'node:test'

interface Sent {
  method: string
  path: string
  query?: Record<string, unknown>
  body?: Record<string, unknown>
}

const sent: Sent[] = []

const store: {
  profiles: unknown[]
  destinations: unknown[]
  roots: unknown[]
  recordings: unknown[]
  jobs: unknown[]
  readStatus: number
  readMessage: string
  writeStatus: number
  writeMessage: string
} = {
  profiles: [],
  destinations: [],
  roots: [],
  recordings: [],
  jobs: [],
  readStatus: 200,
  readMessage: '',
  writeStatus: 201,
  writeMessage: '',
}

const answered = (status: number) => ({ status, ok: status < 400 })

const envelope = (data: unknown) => ({
  data: { status: true, message: '', data },
  response: answered(200),
})

/**
 * The generated client hands a body back under `data` only where the status is
 * one it read as an answer, and under `error` where it read a refusal, so the
 * stand-in answers the same way. A stand-in that filled both would let a
 * refusal be read from the half the real client leaves empty.
 */
const refusal = (status: number, message: string) => ({
  error: { status: false, message, data: null },
  response: answered(status),
})

const PROFILE = {
  id: '0f1e2d3c-4b5a-4968-8776-655443322110',
  label: 'Viewing',
  codec: 'h264',
  resolution: 'asSource',
  deinterlace: 'everyFrame',
  rateFactor: 22,
  quantiser: '24',
  definedAt: '2026-09-05T11:33:06.372061Z',
}

const DESTINATION = {
  id: '1a2b3c4d-5e6f-4a8b-9c0d-1e2f3a4b5c6d',
  label: 'Shelf',
  outputRoot: 'encodes',
  defaultProfileId: PROFILE.id,
  definedAt: '2026-09-05T11:33:06.697339Z',
}

const RECORDING = {
  id: '0123456789abcdef0123456789abcdef',
  programme: { name: '週末キッチンの手帖' },
  startedAt: '2026-09-03T15:45:02Z',
  outputRoot: 'primary',
}

const COMPLETED = {
  id: '9e8d7c6b-5a49-4837-a625-14f3e2d1c0b9',
  recordingId: RECORDING.id,
  profileId: PROFILE.id,
  destinationId: DESTINATION.id,
  outputRoot: 'encodes',
  status: 'completed',
  attempt: 1,
  queuedAt: '2026-09-05T11:33:07.195192Z',
  startedAt: '2026-09-05T11:33:19.921264Z',
  endedAt: '2026-09-05T12:08:14.217838Z',
  route: { asked: 'software', ran: 'software', swerved: null },
  headway: { portion: 1, leftSeconds: 0, at: '2026-09-05T12:08:14.191111Z' },
  quietForSeconds: null,
  stalled: false,
  failure: null,
  artefactName: '0123456789abcdef0123456789abcdef.0f1e2d3c.mp4',
}

const RUNNING = {
  ...COMPLETED,
  id: '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d',
  recordingId: 'fedcba9876543210fedcba9876543210',
  status: 'running',
  endedAt: null,
  route: { asked: 'vaapi', ran: 'software', swerved: 'theCardIsOutOfReach' },
  headway: {
    portion: '0.4249',
    leftSeconds: '623',
    at: '2026-09-05T11:41:00Z',
  },
  quietForSeconds: 754,
  stalled: true,
  artefactName: null,
}

function pageOf(items: unknown[]) {
  return {
    items,
    total: items.length,
    currentPage: 1,
    lastPage: 1,
    perPage: 20,
  }
}

const client = () => ({
  GET: async (
    path: string,
    options?: { params?: { query?: Record<string, unknown> } },
  ) => {
    const query = options?.params?.query
    sent.push({ method: 'GET', path, query })

    if (store.readStatus >= 400) {
      return refusal(store.readStatus, store.readMessage)
    }

    switch (path) {
      case '/api/encoding/profiles':
        return envelope({ items: store.profiles })
      case '/api/encoding/destinations':
        return envelope({ items: store.destinations })
      case '/api/storage':
        return envelope({ roots: store.roots })
      case '/api/recordings':
        return envelope({
          items: store.recordings,
          total: store.recordings.length,
          currentPage: 1,
          lastPage: 1,
          perPage: 200,
        })
      case '/api/encoding/jobs': {
        const asked = query?.status as string[] | undefined
        const kept = asked
          ? store.jobs.filter((one) =>
              asked.includes((one as { status: string }).status),
            )
          : store.jobs

        return envelope(pageOf(kept))
      }
      default:
        throw new Error(`unexpected GET ${path}`)
    }
  },
  POST: async (
    path: string,
    options?: {
      params?: { path?: Record<string, string> }
      body?: Record<string, unknown>
    },
  ) => {
    sent.push({ method: 'POST', path, body: options?.body })

    return store.writeStatus < 400
      ? {
          data: { status: true, message: store.writeMessage, data: null },
          response: answered(store.writeStatus),
        }
      : refusal(store.writeStatus, store.writeMessage)
  },
})

mock.module('@/repository/client/carina', {
  namedExports: { carinaClient: client, revalidatingCarinaClient: client },
})

const {
  callOffEncode,
  defineDestination,
  defineProfile,
  getEncodeScreen,
  listEncodeChoices,
  queueEncode,
} = await import('./encode.ts')

const NOW = new Date('2026-09-05T11:53:34Z')

beforeEach(() => {
  sent.length = 0
  store.profiles = [PROFILE]
  store.destinations = [DESTINATION]
  store.roots = [{ name: 'primary' }, { name: 'encodes' }]
  store.recordings = [RECORDING]
  store.jobs = [RUNNING, COMPLETED]
  store.readStatus = 200
  store.readMessage = ''
  store.writeStatus = 201
  store.writeMessage = ''
})

test('the screen reads the ledger into names, values and counts', async () => {
  const screen = await getEncodeScreen({}, NOW)

  assert.equal(screen.profiles.length, 1)
  assert.equal(screen.profiles[0].quantiser, 24)
  assert.equal(screen.profiles[0].definedAt, '2026/09/05 20:33')
  assert.equal(screen.destinations[0].defaultProfileLabel, 'Viewing')
  assert.deepEqual(screen.roots, ['encodes'])
  assert.equal(screen.jobs.total, 2)
  assert.equal(screen.jobs.status, undefined)
  assert.equal(screen.waiting, 0)
  assert.equal(screen.failed, 0)

  const completed = screen.jobs.items[1]
  assert.equal(completed.title, '週末キッチンの手帖')
  assert.equal(completed.recordedAt, '09/04(金) 00:45')
  assert.equal(completed.profileLabel, 'Viewing')
  assert.equal(completed.destinationLabel, 'Shelf')
  assert.equal(completed.headway?.percent, 100)
  assert.equal(completed.headway?.leftSeconds, 0)
  assert.equal(completed.headway?.at, '21:08:14')
  assert.equal(completed.endedAt, '2026/09/05 21:08')
  assert.equal(completed.quietForSeconds, undefined)
  assert.equal(completed.route?.swerved, undefined)
  assert.equal(completed.cancellable, false)
})

test('a running job carries where it ran, how far it got and how long it has been quiet', async () => {
  const screen = await getEncodeScreen({}, NOW)
  const running = screen.running

  assert.ok(running)
  assert.equal(running.title, undefined)
  assert.equal(running.recordedAt, undefined)
  assert.equal(running.headway?.percent, 42)
  assert.equal(running.headway?.leftSeconds, 623)
  assert.equal(running.elapsedSeconds, 1214)
  assert.equal(running.quietForSeconds, 754)
  assert.equal(running.stalled, true)
  assert.equal(running.cancellable, true)
  assert.deepEqual(running.route, {
    asked: 'vaapi',
    ran: 'software',
    swerved: 'theCardIsOutOfReach',
  })
})

test('the list is narrowed by a status the address names, and the page it names', async () => {
  const screen = await getEncodeScreen({ status: 'completed', page: '2' }, NOW)
  const list = sent.find(
    (one) =>
      one.path === '/api/encoding/jobs' && Number(one.query?.perPage) === 20,
  )

  assert.deepEqual(list?.query, { status: ['completed'], page: 2, perPage: 20 })
  assert.equal(screen.jobs.status, 'completed')
  assert.equal(screen.jobs.items.length, 1)
  assert.equal(screen.jobs.items[0].status, 'completed')
})

test('a status the address misspells narrows nothing', async () => {
  const screen = await getEncodeScreen({ status: 'done' }, NOW)

  assert.equal(screen.jobs.status, undefined)
  assert.equal(screen.jobs.items.length, 2)
})

test('the choices a recording is queued with are every destination and every profile', async () => {
  const choices = await listEncodeChoices()

  assert.deepEqual(choices, {
    profiles: [{ id: PROFILE.id, label: 'Viewing' }],
    destinations: [
      { id: DESTINATION.id, label: 'Shelf', defaultProfileId: PROFILE.id },
    ],
  })
})

test('a queue names the recording and the destination, and the profile only when chosen', async () => {
  assert.deepEqual(await queueEncode(RECORDING.id, DESTINATION.id), {
    state: 'ok',
  })
  assert.deepEqual(sent[0].body, {
    recordingId: RECORDING.id,
    destinationId: DESTINATION.id,
    profileId: null,
  })
})

test('each refusal of a queue is read from the sentence the API answers with', async () => {
  const refused: [number, string, string][] = [
    [
      404,
      'The ledger holds no recording x.',
      'この録画は残っていないため、エンコードできませんでした。',
    ],
    [
      409,
      'Recording x is still being written, and is encoded once it has ended.',
      'この録画はまだ書き込み中のため、エンコードできませんでした。',
    ],
    [
      409,
      'Recording x failed, so there is nothing to encode.',
      'この録画は失敗しているため、エンコードするものがありません。',
    ],
    [
      409,
      'Recording x already has job y running; it is not queued twice.',
      'この録画のエンコードはすでに待機中か実行中です。',
    ],
    [
      409,
      'Recording x was already encoded with profile p by job y, and a second artefact would only collide with the first.',
      'この録画はこのプロファイルですでにエンコード済みです。',
    ],
  ]

  for (const [status, said, message] of refused) {
    store.writeStatus = status
    store.writeMessage = said

    assert.deepEqual(await queueEncode(RECORDING.id, DESTINATION.id), {
      state: 'rejected',
      message,
    })
  }

  store.writeStatus = 401
  assert.deepEqual(await queueEncode(RECORDING.id, DESTINATION.id), {
    state: 'unauthenticated',
  })
})

test('calling a job off is refused once it has ended', async () => {
  store.writeStatus = 200
  assert.deepEqual(await callOffEncode(RUNNING.id), { state: 'ok' })
  assert.equal(sent[0].path, '/api/encoding/jobs/{id}/cancel')

  store.writeStatus = 409
  assert.deepEqual(await callOffEncode(COMPLETED.id), {
    state: 'rejected',
    message: 'このジョブはすでに終わっているため、中止できませんでした。',
  })
})

test('a destination refused for its root says so, and one the driver cannot vouch for says that', async () => {
  const draft = {
    label: 'Shelf',
    outputRoot: 'primary',
    defaultProfileId: PROFILE.id,
  }

  store.writeStatus = 400
  store.writeMessage =
    'outputRoot: a root this process holds for writing; the roots the recordings are read from take no artefact.'
  assert.deepEqual(await defineDestination(draft), {
    state: 'rejected',
    message: 'この出力ルートには成果物を置けません。',
  })

  store.writeStatus = 503
  assert.deepEqual(await defineDestination(draft), {
    state: 'rejected',
    message: '保存先の一覧を確認できないため、保存できませんでした。',
  })
})

test('a profile refused in words of its own keeps the reading for its status', async () => {
  const draft = {
    label: 'Viewing',
    codec: 'h264' as const,
    resolution: 'asSource' as const,
    deinterlace: 'everyFrame' as const,
    rateFactor: 22,
    quantiser: 24,
  }

  store.writeStatus = 400
  store.writeMessage = 'quantiser: a constant quantiser between 0 and 51.'
  assert.deepEqual(await defineProfile(draft), {
    state: 'rejected',
    message: 'この内容ではプロファイルを保存できませんでした。',
  })

  store.writeStatus = 500
  store.writeMessage = 'The ledger would not take the profile.'
  assert.deepEqual(await defineProfile(draft), {
    state: 'rejected',
    message: 'The ledger would not take the profile.(500)。',
  })

  store.writeStatus = 401
  assert.deepEqual(await defineProfile(draft), { state: 'unauthenticated' })
})

test('a destination refused for anything but its root says the general thing', async () => {
  const draft = {
    label: 'Shelf',
    outputRoot: 'encodes',
    defaultProfileId: PROFILE.id,
  }

  store.writeStatus = 400
  store.writeMessage = 'defaultProfileId: the id of a profile that is defined.'
  assert.deepEqual(await defineDestination(draft), {
    state: 'rejected',
    message: 'この内容では保存先を保存できませんでした。',
  })
})

test('a job the ledger no longer holds cannot be called off, and says so', async () => {
  store.writeStatus = 404
  store.writeMessage = 'The ledger holds no job x.'
  assert.deepEqual(await callOffEncode(COMPLETED.id), {
    state: 'rejected',
    message: 'このジョブは残っていないため、中止できませんでした。',
  })

  store.writeStatus = 500
  store.writeMessage = 'The ledger would not take the cancellation.'
  assert.deepEqual(await callOffEncode(RUNNING.id), {
    state: 'rejected',
    message: 'The ledger would not take the cancellation.(500)。',
  })

  store.writeStatus = 401
  assert.deepEqual(await callOffEncode(RUNNING.id), {
    state: 'unauthenticated',
  })
})

test('a ledger that cannot be read throws what the API said about it', async () => {
  store.readStatus = 503
  store.readMessage = 'The encoding ledger is out of reach.'

  await assert.rejects(
    () => listEncodeChoices(),
    /The encoding ledger is out of reach\./,
  )

  store.readMessage = ''
  await assert.rejects(
    () => listEncodeChoices(),
    /エンコードの台帳を読めませんでした/,
  )
})
