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
  WHEN_CALLING_OFF,
  WHEN_CHANGING_A_DESTINATION,
  WHEN_CHANGING_A_PROFILE,
  WHEN_QUEUEING,
  WHEN_REMOVING_A_DESTINATION,
  WHEN_REMOVING_A_PROFILE,
  WHEN_SAVING_A_DESTINATION,
  WHEN_SAVING_A_PROFILE,
  callOffEncode,
  defineDestination,
  defineProfile,
  getEncodeScreen,
  listEncodeChoices,
  queueEncode,
  whyItRefused,
} = await import('@/repository/encode')

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

const RETIRED_AT = '2026-09-07T02:14:51.0000000Z'

const NAMED_BY_A_UUID =
  'A profile, a destination or a job is named by a UUID, and never by one that is all zeroes.'

const RANGE = 'between 0 and 51.'

const REFUSED: [typeof WHEN_QUEUEING, number, string, string][] = [
  [
    WHEN_QUEUEING,
    400,
    'recordingId: A recording is named by the thirty-two hexadecimal digits the ledger holds, without separators.',
    '対象を正しく指定できていないため、エンコードできませんでした。',
  ],
  [
    WHEN_QUEUEING,
    400,
    `destinationId: ${NAMED_BY_A_UUID}`,
    '対象を正しく指定できていないため、エンコードできませんでした。',
  ],
  [
    WHEN_QUEUEING,
    400,
    `profileId: ${NAMED_BY_A_UUID}`,
    '対象を正しく指定できていないため、エンコードできませんでした。',
  ],
  [
    WHEN_QUEUEING,
    404,
    `No destination ${DESTINATION.id} is defined.`,
    'この保存先は残っていないため、エンコードできませんでした。',
  ],
  [
    WHEN_QUEUEING,
    409,
    `Destination ${DESTINATION.id} was retired at ${RETIRED_AT} and takes nothing new.`,
    'この保存先は退役しているため、エンコードできませんでした。',
  ],
  [
    WHEN_QUEUEING,
    404,
    `No profile ${PROFILE.id} is defined.`,
    'このプロファイルは残っていないため、エンコードできませんでした。',
  ],
  [
    WHEN_QUEUEING,
    409,
    `Profile ${PROFILE.id} was retired at ${RETIRED_AT} and nothing is encoded with it again.`,
    'このプロファイルは退役しているため、エンコードできませんでした。',
  ],
  [
    WHEN_QUEUEING,
    404,
    `The ledger holds no recording ${RECORDING.id}.`,
    'この録画は残っていないため、エンコードできませんでした。',
  ],
  [
    WHEN_QUEUEING,
    409,
    `Recording ${RECORDING.id} is still being written, and is encoded once it has ended.`,
    'この録画はまだ書き込み中のため、エンコードできませんでした。',
  ],
  [
    WHEN_QUEUEING,
    409,
    `Recording ${RECORDING.id} failed, so there is nothing to encode.`,
    'この録画は失敗しているため、エンコードするものがありません。',
  ],
  [
    WHEN_QUEUEING,
    409,
    `Recording ${RECORDING.id} already has job ${RUNNING.id} running; it is not queued twice.`,
    'この録画のエンコードはすでに待機中か実行中です。',
  ],
  [
    WHEN_QUEUEING,
    409,
    `Recording ${RECORDING.id} already has job ${RUNNING.id} waiting; it is not queued twice.`,
    'この録画のエンコードはすでに待機中か実行中です。',
  ],
  [
    WHEN_QUEUEING,
    409,
    `Recording ${RECORDING.id} was already encoded with profile ${PROFILE.id} by job ${COMPLETED.id}, and a second artefact would only collide with the first.`,
    'この録画はこのプロファイルですでにエンコード済みです。',
  ],
  [
    WHEN_CALLING_OFF,
    400,
    NAMED_BY_A_UUID,
    '対象を正しく指定できていないため、中止できませんでした。',
  ],
  [
    WHEN_CALLING_OFF,
    404,
    `The ledger holds no job ${COMPLETED.id}.`,
    'このジョブは残っていないため、中止できませんでした。',
  ],
  [
    WHEN_CALLING_OFF,
    409,
    `Job ${COMPLETED.id} already ended as Completed, and cannot be called off.`,
    'このジョブはすでに終わっているため、中止できませんでした。',
  ],
  [
    WHEN_CALLING_OFF,
    409,
    `Job ${RUNNING.id} moved in the ledger while it was being called off; read it again.`,
    'このジョブは中止の途中で状態が変わったため、中止できませんでした。',
  ],
  [
    WHEN_SAVING_A_PROFILE,
    400,
    'A profile is defined by label, codec, resolution, deinterlace, rateFactor and quantiser, and every one of them is given.',
    'プロファイルの内容が揃っていないため、保存できませんでした。',
  ],
  [
    WHEN_SAVING_A_PROFILE,
    400,
    'label: a name a person reads, and not an empty one.',
    '名称が入力されていないため、保存できませんでした。',
  ],
  [
    WHEN_SAVING_A_PROFILE,
    400,
    'label: at most 64 characters.',
    '名称が 64 文字を超えているため、保存できませんでした。',
  ],
  [
    WHEN_SAVING_A_PROFILE,
    400,
    'codec: one of H264, H265.',
    'コーデックの指定が正しくないため、保存できませんでした。',
  ],
  [
    WHEN_SAVING_A_PROFILE,
    400,
    'resolution: one of AsSource, FullHd, Hd.',
    '解像度の指定が正しくないため、保存できませんでした。',
  ],
  [
    WHEN_SAVING_A_PROFILE,
    400,
    'deinterlace: one of Leave, EveryFrame, EveryField.',
    'インタレース解除の指定が正しくないため、保存できませんでした。',
  ],
  [
    WHEN_SAVING_A_PROFILE,
    400,
    `rateFactor: a constant rate factor ${RANGE}`,
    '品質(CRF)が 0 〜 51 の範囲にないため、保存できませんでした。',
  ],
  [
    WHEN_SAVING_A_PROFILE,
    400,
    `quantiser: a constant quantiser ${RANGE}`,
    '品質(QP)が 0 〜 51 の範囲にないため、保存できませんでした。',
  ],
  [
    WHEN_CHANGING_A_PROFILE,
    400,
    'A profile is defined by label, codec, resolution, deinterlace, rateFactor and quantiser, and a change carries every one of them rather than the ones that moved.',
    'プロファイルの内容が揃っていないため、変更できませんでした。',
  ],
  [
    WHEN_CHANGING_A_PROFILE,
    404,
    `No profile ${PROFILE.id} is defined.`,
    'このプロファイルは残っていないため、変更できませんでした。',
  ],
  [
    WHEN_CHANGING_A_PROFILE,
    409,
    `Profile ${PROFILE.id} was retired at ${RETIRED_AT}; a retired definition stands as it was so that what was encoded with it still reads.`,
    'このプロファイルは退役しているため、変更できませんでした。',
  ],
  [
    WHEN_CHANGING_A_PROFILE,
    409,
    `Profile ${PROFILE.id} is what job ${RUNNING.id} is running with, and it stands still until that job has ended or been called off.`,
    'このプロファイルを使うジョブが実行中か待機中のため、変更できませんでした。',
  ],
  [
    WHEN_REMOVING_A_PROFILE,
    409,
    `Profile ${PROFILE.id} is what job ${RUNNING.id} is waiting to run with, and it stands still until that job has ended or been called off.`,
    'このプロファイルを使うジョブが実行中か待機中のため、撤去できませんでした。',
  ],
  [
    WHEN_REMOVING_A_PROFILE,
    409,
    `Profile ${PROFILE.id} was retired at ${RETIRED_AT}; a retired definition stands as it was so that what was encoded with it still reads.`,
    'このプロファイルは退役しているため、撤去できませんでした。',
  ],
  [
    WHEN_REMOVING_A_PROFILE,
    409,
    `Profile ${PROFILE.id} is what destination ${DESTINATION.id} encodes with unless another is asked for; point that destination at another profile first.`,
    'このプロファイルを既定にしている保存先があるため、撤去できませんでした。',
  ],
  [
    WHEN_SAVING_A_DESTINATION,
    400,
    'A destination is defined by label, outputRoot and defaultProfileId.',
    '保存先の内容が揃っていないため、保存できませんでした。',
  ],
  [
    WHEN_SAVING_A_DESTINATION,
    400,
    'outputRoot: the name of a root the storage surface declares.',
    'この出力ルートは残っていないため、保存できませんでした。',
  ],
  [
    WHEN_SAVING_A_DESTINATION,
    400,
    'outputRoot: a root this process holds for writing; the roots the recordings are read from take no artefact.',
    'この出力ルートには成果物を置けないため、保存できませんでした。',
  ],
  [
    WHEN_SAVING_A_DESTINATION,
    400,
    'defaultProfileId: the id of a profile that is defined and still offered.',
    '既定のプロファイルが選ばれていないため、保存できませんでした。',
  ],
  [
    WHEN_SAVING_A_DESTINATION,
    503,
    "The set of output roots cannot be read while the driver does not answer, so no destination is saved: The driver's socket could not be reached (ConnectionRefused).",
    'driver に接続できないため、保存できませんでした。',
  ],
  [
    WHEN_SAVING_A_DESTINATION,
    502,
    'The set of output roots cannot be read while the driver does not answer, so no destination is saved: the driver answered without saying anything.',
    'driver に接続できないため、保存できませんでした。',
  ],
  [
    WHEN_CHANGING_A_DESTINATION,
    400,
    'A destination is defined by label, outputRoot and defaultProfileId, and a change carries every one of them rather than the ones that moved.',
    '保存先の内容が揃っていないため、変更できませんでした。',
  ],
  [
    WHEN_CHANGING_A_DESTINATION,
    404,
    `No destination ${DESTINATION.id} is defined.`,
    'この保存先は残っていないため、変更できませんでした。',
  ],
  [
    WHEN_CHANGING_A_DESTINATION,
    409,
    `Destination ${DESTINATION.id} was retired at ${RETIRED_AT}; a retired definition stands as it was so that what was encoded with it still reads.`,
    'この保存先は退役しているため、変更できませんでした。',
  ],
  [
    WHEN_CHANGING_A_DESTINATION,
    409,
    `Destination ${DESTINATION.id} is what job ${RUNNING.id} is running with, and it stands still until that job has ended or been called off.`,
    'この保存先を使うジョブが実行中か待機中のため、変更できませんでした。',
  ],
  [
    WHEN_REMOVING_A_DESTINATION,
    409,
    `Destination ${DESTINATION.id} is the only one left, and a machine with nowhere to put an artefact encodes nothing; define the one that replaces it first.`,
    'この保存先は最後の 1 つのため、撤去できませんでした。',
  ],
  [
    WHEN_REMOVING_A_DESTINATION,
    409,
    `Destination ${DESTINATION.id} was retired at ${RETIRED_AT}; a retired definition stands as it was so that what was encoded with it still reads.`,
    'この保存先は退役しているため、撤去できませんでした。',
  ],
]

test('every sentence the encode endpoints refuse with, as Carina writes it, is read into one Japanese one', () => {
  for (const [asking, status, said, message] of REFUSED) {
    assert.equal(whyItRefused(asking, status, said), message)
    assert.doesNotMatch(whyItRefused(asking, status, said), /\(\d{3}\)。$/)
  }
})

test('a refusal that names several fields at once names them in one sentence', () => {
  assert.equal(
    whyItRefused(
      WHEN_SAVING_A_PROFILE,
      400,
      'label: a name a person reads, and not an empty one. codec: one of H264, H265. quantiser: a constant quantiser between 0 and 51.',
    ),
    '名称が入力されていない、コーデックの指定が正しくない、品質(QP)が 0 〜 51 の範囲にないため、保存できませんでした。',
  )
})

test('a destination the driver could not vouch for says so with nothing but the status to read', () => {
  assert.equal(
    whyItRefused(WHEN_SAVING_A_DESTINATION, 503, undefined),
    'driver に接続できないため、保存できませんでした。',
  )
  assert.equal(
    whyItRefused(WHEN_CHANGING_A_DESTINATION, 502, undefined),
    'driver に接続できないため、変更できませんでした。',
  )
})

test('a refusal nothing accounts for is a number, and never the sentence the API sent', () => {
  assert.equal(
    whyItRefused(
      WHEN_SAVING_A_PROFILE,
      500,
      'The ledger would not take the profile.',
    ),
    'プロファイルを保存できませんでした(500)。',
  )
  assert.equal(
    whyItRefused(WHEN_QUEUEING, 500, undefined),
    'エンコードを登録できませんでした(500)。',
  )
  assert.equal(
    whyItRefused(WHEN_REMOVING_A_DESTINATION, 502, 'Bad Gateway'),
    '保存先を撤去できませんでした(502)。',
  )
})

test('each refusal of a queue is read from the sentence the API answers with', async () => {
  for (const [asking, status, said, message] of REFUSED) {
    if (asking !== WHEN_QUEUEING) {
      continue
    }

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
  store.writeMessage = `Job ${COMPLETED.id} already ended as Completed, and cannot be called off.`
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
    message: 'この出力ルートには成果物を置けないため、保存できませんでした。',
  })

  store.writeStatus = 503
  store.writeMessage =
    "The set of output roots cannot be read while the driver does not answer, so no destination is saved: The driver's socket could not be reached (ConnectionRefused)."
  assert.deepEqual(await defineDestination(draft), {
    state: 'rejected',
    message: 'driver に接続できないため、保存できませんでした。',
  })
})

test('a profile refused for a value out of range names the field, and an unaccounted refusal is a number', async () => {
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
    message: '品質(QP)が 0 〜 51 の範囲にないため、保存できませんでした。',
  })

  store.writeStatus = 500
  store.writeMessage = 'The ledger would not take the profile.'
  assert.deepEqual(await defineProfile(draft), {
    state: 'rejected',
    message: 'プロファイルを保存できませんでした(500)。',
  })

  store.writeStatus = 401
  assert.deepEqual(await defineProfile(draft), { state: 'unauthenticated' })
})

test('a destination refused for its default profile names that field', async () => {
  const draft = {
    label: 'Shelf',
    outputRoot: 'encodes',
    defaultProfileId: PROFILE.id,
  }

  store.writeStatus = 400
  store.writeMessage =
    'defaultProfileId: the id of a profile that is defined and still offered.'
  assert.deepEqual(await defineDestination(draft), {
    state: 'rejected',
    message: '既定のプロファイルが選ばれていないため、保存できませんでした。',
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
    message: 'このジョブを中止できませんでした(500)。',
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
