import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { formatMoment, formatMomentSpan } from '@/lib/format'

interface Sent {
  method: string
  path: string
  body?: Record<string, unknown>
}

const sent: Sent[] = []

const store: {
  ledger: unknown
  ledgerStatus: number
  driver: unknown
  health: unknown
  healthStatus: number
  writeStatus: number
  writeOk: boolean
  writeMessage: string
  written: Reply
  detected: Reply
} = {
  ledger: undefined,
  ledgerStatus: 200,
  driver: null,
  health: undefined,
  healthStatus: 200,
  writeStatus: 200,
  writeOk: true,
  writeMessage: '',
  written: { status: 200 },
  detected: { status: 200 },
}

interface Reply {
  status: number
  body?: unknown
}

interface Asking {
  params?: { path?: Record<string, string> }
  body?: Record<string, unknown>
}

const pathOf = (template: string, init?: Asking) =>
  template.replace(/\{(\w+)\}/g, (_, name: string) =>
    String(init?.params?.path?.[name]),
  )

const replying = ({ status, body }: Reply) => ({
  data: status < 300 ? body : undefined,
  error: status < 300 ? undefined : body,
  response: answered(status),
})

const answered = (status: number) => ({ status, ok: status < 400 })

const ledger = () => ({
  desired: [
    {
      deviceId: 'adapter0.frontend0',
      disabled: false,
      lnbPower: false,
      kind: 'terrestrial',
    },
  ],
  savedHash: 'a',
  loadedHash: 'a',
  drifted: false,
  observed: [],
  observedAt: '2026-08-08T18:10:00Z',
  observationFailure: null,
})

const health = (hoursOfSilence: number | string) => ({
  systems: [] as unknown[],
  hoursOfSilence,
  undetermined: [] as string[],
})

const reaching = (
  system: string,
  level: string,
  lastSeenAt: string | null,
  services = 27,
) => ({ system, level, services, lastSeenAt })

const SEEN_AT = '2026-08-08T18:00:00Z'

function observing(kind: string): void {
  store.ledger = {
    ...(ledger() as Record<string, unknown>),
    observed: [
      {
        deviceId: 'adapter0.frontend0',
        kind,
        state: 'idle',
        detail: null,
        health: 'healthy',
        disablePending: false,
        lnbPowered: false,
        healthDetail: null,
        healthChangedAt: null,
        sessionId: null,
        sessionPurpose: 'unspecified',
        sessionStartedAt: null,
        sessionEndsAt: null,
        sessionTuning: null,
      },
    ],
  }
}

async function screen() {
  const answer = await getTuners()

  assert.equal(answer.state, 'ok')

  if (answer.state !== 'ok') {
    throw new Error('the tuner screen did not open')
  }

  return answer.result
}

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({
      GET: async (path: string) => {
        sent.push({ method: 'GET', path })

        if (path === '/api/tuners/detected') {
          return replying(store.detected)
        }

        if (path === '/api/tuners/health') {
          return store.healthStatus === 200
            ? {
                data: { status: true, message: '', data: store.health },
                response: answered(200),
              }
            : { data: undefined, response: answered(store.healthStatus) }
        }

        if (path === '/api/driver/status') {
          return {
            data: { status: true, message: '', data: store.driver },
            response: answered(200),
          }
        }

        return store.ledgerStatus === 200
          ? {
              data: { status: true, message: '', data: store.ledger },
              response: answered(200),
            }
          : { data: undefined, response: answered(store.ledgerStatus) }
      },
      PUT: async (path: string, init?: { body?: Record<string, unknown> }) => {
        sent.push({ method: 'PUT', path, body: init?.body })

        return {
          data: {
            status: store.writeOk,
            message: store.writeMessage,
            data: null,
          },
          response: answered(store.writeStatus),
        }
      },
      PATCH: async (template: string, init?: Asking) => {
        sent.push({
          method: 'PATCH',
          path: pathOf(template, init),
          body: init?.body,
        })

        return replying(store.written)
      },
      POST: async (template: string, init?: Asking) => {
        sent.push({ method: 'POST', path: pathOf(template, init) })

        return replying(store.written)
      },
    }),
    revalidatingCarinaClient: () => {
      throw new Error('the tuner ledger does not revalidate')
    },
  },
})

const {
  getDetectedTuners,
  getTuners,
  parseRestartTicket,
  restartDriver,
  saveDetectedTuners,
  serializeRestartTicket,
  setHoursOfSilence,
  setLnbPower,
  setTunerDisabled,
  toRestartWindow,
} = await import('@/repository/tuners')

function standing(hoursOfSilence: number | string = 24): void {
  sent.length = 0
  store.ledger = ledger()
  store.ledgerStatus = 200
  store.driver = null
  store.health = health(hoursOfSilence)
  store.healthStatus = 200
  store.writeStatus = 200
  store.writeOk = true
  store.writeMessage = ''
  store.written = { status: 200 }
  store.detected = { status: 200 }
}

const threshold = async () => {
  const answer = await getTuners()

  assert.equal(answer.state, 'ok')

  return answer.state === 'ok' ? answer.result.thresholdHours : undefined
}

test('the threshold on screen is the one the API is holding', async () => {
  standing(72)

  assert.equal(await threshold(), 72)
})

test('a threshold the API spells as a string still reads as a number', async () => {
  standing('48')

  assert.equal(await threshold(), 48)
})

test('a threshold that will not be read falls back to the default, not to silence', async () => {
  standing()
  store.healthStatus = 503

  assert.equal(await threshold(), 24)
})

test('the ledger is still read when the threshold is not', async () => {
  standing()
  store.healthStatus = 503

  const answer = await getTuners()

  assert.equal(answer.state, 'ok')
  assert.equal(answer.state === 'ok' ? answer.result.rows.length : 0, 1)
})

test('a new threshold is sent as the hours it was asked for', async () => {
  standing()

  const result = await setHoursOfSilence(36)

  assert.deepEqual(result, { state: 'ok' })
  assert.deepEqual(sent.at(-1), {
    method: 'PUT',
    path: '/api/tuners/health/settings',
    body: { hoursOfSilence: 36 },
  })
})

test('a threshold the API will not take says what it would have taken', async () => {
  standing()
  store.writeStatus = 400
  store.writeOk = false

  const result = await setHoursOfSilence(9999)

  assert.equal(result.state, 'rejected')
  assert.match(
    result.state === 'rejected' ? result.message : '',
    /1 〜 720 時間/,
  )
})

test('a session that is gone is told apart from a threshold that was refused', async () => {
  standing()
  store.writeStatus = 401

  assert.deepEqual(await setHoursOfSilence(36), { state: 'unauthenticated' })
})

test('a driver connection this build has no case for leaves the link unknown', async () => {
  standing()
  store.driver = {
    connection: 'somethingTheApiAddedLater',
    hello: null,
    appProtocolVersion: 1,
    missingCapabilities: [],
    driverUpdateRequired: false,
    observedAt: '2026-08-08T18:10:00Z',
  }

  const answer = await getTuners()

  assert.equal(answer.state, 'ok')
  assert.equal(
    answer.state === 'ok' ? answer.result.connection : undefined,
    'unknown',
  )
})

test('a driver connection this build does know is still read as it always was', async () => {
  standing()
  store.driver = {
    connection: 'connected',
    hello: { instanceId: 'i-1', draining: false },
    appProtocolVersion: 1,
    missingCapabilities: [],
    driverUpdateRequired: false,
    observedAt: '2026-08-08T18:10:00Z',
  }

  const answer = await getTuners()

  assert.equal(
    answer.state === 'ok' ? answer.result.connection : undefined,
    'connected',
  )
})

test('the last service a tuner saw is the one the API reports for its system', async () => {
  standing()
  observing('terrestrial')
  store.health = {
    ...health(24),
    systems: [reaching('isdbT', 'reaching', SEEN_AT)],
  }

  assert.equal((await screen()).rows[0]?.lastService?.at, formatMoment(SEEN_AT))
})

test('a system the API calls silent is put on the screen as the API judged it', async () => {
  standing()
  observing('terrestrial')
  store.health = {
    ...health(24),
    systems: [reaching('isdbT', 'silent', SEEN_AT, 0)],
  }

  assert.deepEqual((await screen()).notices, [
    {
      tone: 'warn',
      body: `地上波のサービスをいま受信できていません。最後に受信したのは ${formatMoment(
        SEEN_AT,
      )} です。`,
      actions: [
        { label: '切り分けを見る', href: '/settings/channels#system-isdbT' },
      ],
    },
  ])
})

test('a system silent for longer than the threshold is said to be the graver one', async () => {
  standing(48)
  observing('satellite')
  store.health = {
    ...health(48),
    systems: [reaching('isdbSBs', 'missing', SEEN_AT, 0)],
  }

  const notices = (await screen()).notices

  assert.equal(notices[0]?.tone, 'danger')
  assert.match(
    notices[0]?.body ?? '',
    /BSのサービスを 48 時間以上受信していません。/,
  )
})

test('a system that is reaching leaves the screen quiet', async () => {
  standing()
  observing('terrestrial')
  store.health = {
    ...health(24),
    systems: [reaching('isdbT', 'reaching', SEEN_AT)],
  }

  assert.deepEqual((await screen()).notices, [])
})

test('a satellite tuner the API says nothing about is left without an answer', async () => {
  standing()
  observing('satellite')
  store.health = {
    ...health(24),
    systems: [reaching('isdbT', 'reaching', SEEN_AT)],
  }

  const result = await screen()

  assert.equal(result.rows[0]?.lastService, undefined)
  assert.deepEqual(result.notices, [])
})

test('a system named in a way this build has no case for is left out', async () => {
  standing()
  observing('terrestrial')
  store.health = {
    ...health(24),
    systems: [reaching('unspecified', 'missing', SEEN_AT, 0)],
  }

  const result = await screen()

  assert.deepEqual(result.reach, [])
  assert.deepEqual(result.notices, [])
})

test('a health the API will not answer leaves the last service blank, not guessed', async () => {
  standing()
  observing('terrestrial')
  store.healthStatus = 503

  const result = await screen()

  assert.equal(result.rows[0]?.lastService, undefined)
  assert.deepEqual(result.reach, [])
})

function observedAs(over: Record<string, unknown>): void {
  observing('terrestrial')
  store.ledger = {
    ...(store.ledger as Record<string, unknown>),
    observed: [
      {
        ...((store.ledger as { observed: Record<string, unknown>[] })
          .observed[0] ?? {}),
        ...over,
      },
    ],
  }
}

const A_DEVICE_TURNED_OFF =
  'This device was turned off and comes out of service as soon as the session it holds ends.'

const NOTHING_CAME_BACK = 'The last three tunes on this device timed out.'

test('a tuner the driver calls faulted carries the sentence the driver wrote beside it', async () => {
  standing()
  observedAs({ state: 'faulted', detail: NOTHING_CAME_BACK })

  const row = (await screen()).rows[0]

  assert.equal(row?.stateLabel, '異常')
  assert.equal(row?.stateSub, NOTHING_CAME_BACK)
})

test('a tuner faulted on its health alone reads the sentence written beside the health', async () => {
  standing()
  observedAs({ health: 'faulted', healthDetail: A_DEVICE_TURNED_OFF })

  const row = (await screen()).rows[0]

  assert.equal(row?.stateLabel, '異常')
  assert.equal(row?.stateSub, A_DEVICE_TURNED_OFF)
})

test('a tuner the driver only warns about carries the sentence too', async () => {
  standing()
  observedAs({ health: 'degraded', healthDetail: A_DEVICE_TURNED_OFF })

  const row = (await screen()).rows[0]

  assert.equal(row?.stateLabel, '警告')
  assert.equal(row?.stateSub, A_DEVICE_TURNED_OFF)
})

test('a tuner the driver wrote nothing about is left without a sentence', async () => {
  standing()
  observedAs({ state: 'faulted', detail: null, healthDetail: null })

  const row = (await screen()).rows[0]

  assert.equal(row?.stateLabel, '異常')
  assert.equal(row?.stateSub, undefined)
})

test('a healthy tuner is not given a sentence it has no state to explain', async () => {
  standing()
  observedAs({ healthDetail: A_DEVICE_TURNED_OFF })

  const row = (await screen()).rows[0]

  assert.equal(row?.stateLabel, '正常')
  assert.equal(row?.stateSub, undefined)
})

const envelope = (data: unknown, message = '') => ({
  status: data !== null,
  message,
  data,
})

const DEVICE = 'adapter0.frontend0'

const TOGGLED = {
  status: 200,
  body: envelope({ deviceId: DEVICE, kind: 'terrestrial', state: 'disabled' }),
}

test('turning a tuner off is sent to that tuner alone, saying off', async () => {
  standing()
  store.written = TOGGLED

  assert.deepEqual(await setTunerDisabled(DEVICE, true), { state: 'ok' })
  assert.deepEqual(sent.at(-1), {
    method: 'PATCH',
    path: `/api/tuners/${DEVICE}`,
    body: { disabled: true },
  })
})

test('turning a tuner back on says on', async () => {
  standing()
  store.written = TOGGLED

  await setTunerDisabled(DEVICE, false)

  assert.deepEqual(sent.at(-1)?.body, { disabled: false })
})

test('a switch the API will not take says what the API answered', async () => {
  for (const reply of [
    { status: 409, body: envelope(null, 'the device is not in the ledger') },
    { status: 502 },
  ]) {
    standing()
    store.written = reply

    assert.deepEqual(await setTunerDisabled(DEVICE, true), {
      state: 'unavailable',
      message: `API は ${reply.status} を返しました。`,
    })
  }
})

test('a switch whose session is gone is told apart from a refusal', async () => {
  standing()
  store.written = { status: 401 }

  assert.deepEqual(await setTunerDisabled(DEVICE, true), {
    state: 'unauthenticated',
  })
})

const ACCEPTED = (over: Record<string, unknown> = {}) => ({
  status: 202,
  body: envelope({
    instanceId: 'instance-before',
    acceptedAt: '2026-10-03T12:00:00Z',
    budgetSeconds: 30,
    ...over,
  }),
})

test('a restart the driver accepts carries the instance it is leaving and how long to wait', async () => {
  standing()
  store.written = ACCEPTED({ budgetSeconds: '30' })

  assert.deepEqual(await restartDriver(), {
    state: 'accepted',
    instanceId: 'instance-before',
    budgetSeconds: 30,
  })
  assert.deepEqual(sent.at(-1), {
    method: 'POST',
    path: '/api/driver/restart',
  })
})

test('the wait for a restart is held between ten seconds and a minute', async () => {
  for (const [asked, held] of [
    [3, 10],
    [45, 45],
    [600, 60],
  ]) {
    standing()
    store.written = ACCEPTED({ budgetSeconds: asked })

    const result = await restartDriver()

    assert.equal(result.state === 'accepted' ? result.budgetSeconds : 0, held)
  }
})

test('a driver that never said who it was restarts without an instance to watch for', async () => {
  standing()
  store.written = ACCEPTED({ instanceId: null })

  const result = await restartDriver()

  assert.equal(result.state, 'accepted')
  assert.equal(
    result.state === 'accepted' ? result.instanceId : 'kept',
    undefined,
  )
})

const LAST_ENDS = '2026-10-03T21:30:00.0000000+09:00'

test('a restart held back by recordings says how many and until when', async () => {
  standing()
  store.written = {
    status: 409,
    body: envelope(
      null,
      `2 recording(s) are running (a, b); the driver is not restarted until the last one ends at ${LAST_ENDS}.`,
    ),
  }

  assert.deepEqual(await restartDriver(), {
    state: 'recording',
    recordings: 2,
    until: formatMoment(LAST_ENDS),
  })
})

test('a restart held back in words this build cannot read is still held back', async () => {
  standing()
  store.written = { status: 409, body: envelope(null, 'busy') }

  assert.deepEqual(await restartDriver(), {
    state: 'recording',
    recordings: undefined,
    until: undefined,
  })
})

test('each way a restart is turned down has a state of its own', async () => {
  for (const [status, state] of [
    [401, 'unauthenticated'],
    [503, 'disconnected'],
    [501, 'unsupported'],
    [502, 'mismatched'],
  ] as const) {
    standing()
    store.written = { status, body: envelope(null) }

    assert.deepEqual(await restartDriver(), { state })
  }
})

test('any other answer to a restart is a refusal carrying its status', async () => {
  for (const reply of [
    { status: 500, body: envelope(null, 'failed') },
    { status: 400, body: envelope(null, 'bad') },
    { status: 202 },
  ]) {
    standing()
    store.written = reply

    assert.deepEqual(await restartDriver(), {
      state: 'refused',
      status: reply.status,
    })
  }
})

const TICKET = {
  previousInstanceId: 'instance-before',
  deadline: Date.parse('2026-10-03T12:00:30Z'),
  budgetSeconds: 30,
}

test('a restart ticket reads back as the ticket it was written from', () => {
  assert.deepEqual(parseRestartTicket(serializeRestartTicket(TICKET)), TICKET)
  assert.deepEqual(
    parseRestartTicket(
      serializeRestartTicket({ ...TICKET, previousInstanceId: undefined }),
    ),
    { ...TICKET, previousInstanceId: undefined },
  )
})

test('a ticket that is missing or not a ticket is no restart at all', () => {
  for (const value of [
    undefined,
    '',
    'instance|soon|30',
    'instance|1767225600000|',
    'instance||30',
    'instance',
  ] as (string | undefined)[]) {
    assert.equal(parseRestartTicket(value), undefined, String(value))
  }
})

const connected = (instanceId?: string) => ({
  connection: 'connected' as const,
  instanceId,
})

test('no ticket means no restart is being waited for', () => {
  assert.equal(
    toRestartWindow(undefined, connected('instance-after')),
    undefined,
  )
})

test('a driver back under another instance has returned', () => {
  assert.deepEqual(
    toRestartWindow(TICKET, connected('instance-after'), TICKET.deadline + 1),
    { state: 'returned', instanceId: 'instance-after' },
  )
})

test('the same instance still answering is still restarting until the deadline, then overdue', () => {
  assert.deepEqual(
    toRestartWindow(TICKET, connected('instance-before'), TICKET.deadline - 1),
    { state: 'restarting', deadline: TICKET.deadline, budgetSeconds: 30 },
  )
  assert.deepEqual(
    toRestartWindow(TICKET, { connection: 'disconnected' }, TICKET.deadline),
    { state: 'overdue', budgetSeconds: 30 },
  )
})

test('a restart with no instance to compare cannot say the driver came back', () => {
  const blind = { ...TICKET, previousInstanceId: undefined }

  assert.deepEqual(
    toRestartWindow(blind, connected('instance-after'), TICKET.deadline - 1),
    { state: 'unverifiable' },
  )
  assert.deepEqual(
    toRestartWindow(blind, { connection: 'disconnected' }, TICKET.deadline - 1),
    { state: 'restarting', deadline: TICKET.deadline, budgetSeconds: 30 },
  )
})

const detectedDevice = (
  deviceId: string,
  kinds: string[],
  detection = 'detected',
) => ({ deviceId, detection, kinds, detail: null })

test('a detection reads each added, vanished and mismatched device as a row', async () => {
  standing()
  store.detected = {
    status: 200,
    body: envelope({
      devices: [
        detectedDevice(DEVICE, ['terrestrial']),
        detectedDevice('adapter1.frontend0', ['satellite', 'terrestrial']),
        detectedDevice('adapter2.frontend0', [], 'permissionDenied'),
      ],
      added: ['adapter1.frontend0', 'adapter2.frontend0'],
      missing: ['adapter3.frontend0'],
      mismatched: [
        {
          deviceId: DEVICE,
          observed: 'satellite',
          detected: ['terrestrial'],
        },
      ],
    }),
  }

  assert.deepEqual(await getDetectedTuners(), {
    state: 'ok',
    detection: {
      detected: [DEVICE, 'adapter1.frontend0'],
      changes: true,
      rows: [
        {
          kind: 'add',
          tag: '新規',
          device: 'adapter1.frontend0',
          note: '衛星・地上波として検出されました',
        },
        {
          kind: 'add',
          tag: '新規',
          device: 'adapter2.frontend0',
          note: 'アクセス権がないため保存されません',
        },
        {
          kind: 'del',
          tag: '消失',
          device: 'adapter3.frontend0',
          note: '接続が確認できません',
        },
        {
          kind: 'kind',
          tag: '種別相違',
          device: DEVICE,
          note: '一覧は 衛星 / 検出は 地上波',
        },
      ],
    },
  })
  assert.deepEqual(sent.at(-1), {
    method: 'GET',
    path: '/api/tuners/detected',
  })
})

test('a detection that only finds devices it cannot save changes nothing', async () => {
  standing()
  store.detected = {
    status: 200,
    body: envelope({
      devices: [detectedDevice('adapter2.frontend0', [], 'busy')],
      added: ['adapter2.frontend0'],
      missing: [],
      mismatched: [],
    }),
  }

  const result = await getDetectedTuners()

  assert.equal(result.state === 'ok' ? result.detection.changes : true, false)
  assert.deepEqual(
    result.state === 'ok' ? result.detection.detected : undefined,
    [],
  )
})

test('a detection the API will not give says what it answered', async () => {
  for (const reply of [
    { status: 503, body: envelope(null, 'not connected') },
    { status: 200, body: envelope(null) },
    { status: 502 },
  ]) {
    standing()
    store.detected = reply

    assert.deepEqual(await getDetectedTuners(), {
      state: 'unavailable',
      message: `API は ${reply.status} を返しました。`,
    })
  }

  standing()
  store.detected = { status: 401 }

  assert.deepEqual(await getDetectedTuners(), { state: 'unauthenticated' })
})

function ledgerOf(
  desired: Record<string, unknown>[],
  observed: Record<string, unknown>[] = [],
): void {
  store.ledger = {
    ...(ledger() as Record<string, unknown>),
    desired,
    observed,
  }
}

const desired = (deviceId: string, disabled: boolean, lnbPower = false) => ({
  deviceId,
  disabled,
  lnbPower,
  kind: 'terrestrial',
})

const observation = (
  deviceId: string,
  state: string,
  disablePending = false,
) => ({ deviceId, kind: 'terrestrial', state, disablePending })

const savedTuners = () => {
  const put = sent.findLast((one) => one.method === 'PUT')

  return put?.path === '/api/tuners' ? put.body?.tuners : undefined
}

test('saving a detection writes every device detected, keeping what each was set to', async () => {
  standing()
  ledgerOf([desired(DEVICE, true), desired('adapter1.frontend0', false, true)])

  assert.deepEqual(
    await saveDetectedTuners([
      DEVICE,
      'adapter1.frontend0',
      'adapter2.frontend0',
    ]),
    { state: 'ok' },
  )
  assert.deepEqual(savedTuners(), [
    { deviceId: DEVICE, disabled: true, lnbPower: false },
    { deviceId: 'adapter1.frontend0', disabled: false, lnbPower: true },
    { deviceId: 'adapter2.frontend0', disabled: false, lnbPower: false },
  ])
})

test('a tuner the driver is taking out of service is saved as off, whatever the ledger said', async () => {
  standing()
  ledgerOf(
    [
      desired(DEVICE, false),
      desired('adapter1.frontend0', false),
      desired('adapter2.frontend0', false),
      desired('adapter3.frontend0', true),
    ],
    [
      observation(DEVICE, 'disabled'),
      observation('adapter1.frontend0', 'draining'),
      observation('adapter2.frontend0', 'idle', true),
      observation('adapter3.frontend0', 'idle'),
    ],
  )

  await saveDetectedTuners([
    DEVICE,
    'adapter1.frontend0',
    'adapter2.frontend0',
    'adapter3.frontend0',
  ])

  assert.deepEqual(
    (savedTuners() as { disabled: boolean }[]).map(({ disabled }) => disabled),
    [true, true, true, false],
  )
})

test('nothing is saved when the ledger before it cannot be read', async () => {
  standing()
  store.ledgerStatus = 503

  assert.deepEqual(await saveDetectedTuners([DEVICE]), {
    state: 'rejected',
    message: '保存前の一覧を読み取れなかったため、保存していません(503)。',
  })
  assert.equal(savedTuners(), undefined)

  standing()
  store.ledgerStatus = 401

  assert.deepEqual(await saveDetectedTuners([DEVICE]), {
    state: 'unauthenticated',
  })
  assert.equal(savedTuners(), undefined)
})

test('a detection of no devices is never saved as an empty ledger', async () => {
  standing()

  const result = await saveDetectedTuners([])

  assert.equal(result.state, 'rejected')
  assert.match(result.state === 'rejected' ? result.message : '', /1 台も/)
  assert.equal(savedTuners(), undefined)
})

test('a save the API refuses is said in the words of why it refused', async () => {
  for (const [status, message, said] of [
    [409, 'unknownDevice: adapter9.frontend0', /もう一度検出してください/],
    [422, 'undeterminedKind: adapter0.frontend0', /種別を判定できない/],
    [500, 'ledgerUnwritable: read-only', /driver が一覧を書き込めない/],
    [501, 'the driver cannot detect', /デバイス検出に対応していない/],
    [503, 'no driver', /driver に接続できない/],
    [400, 'somethingNew: x', /保存できませんでした\(400\)/],
  ] as const) {
    standing()
    store.writeStatus = status
    store.writeOk = false
    store.writeMessage = message

    const result = await saveDetectedTuners([DEVICE])

    assert.equal(result.state, 'rejected', message)
    assert.match(result.state === 'rejected' ? result.message : '', said)
  }
})

test('a save whose session is gone is told apart from a refusal', async () => {
  standing()
  store.writeStatus = 401

  assert.deepEqual(await saveDetectedTuners([DEVICE]), {
    state: 'unauthenticated',
  })
})

const satellite = (deviceId: string, lnbPower: boolean) => ({
  deviceId,
  disabled: false,
  lnbPower,
  kind: 'satellite',
})

const observedPower = (
  deviceId: string,
  kind: string,
  lnbPowered: boolean,
) => ({
  deviceId,
  kind,
  state: 'idle',
  detail: null,
  health: 'healthy',
  disablePending: false,
  lnbPowered,
  healthDetail: null,
  healthChangedAt: null,
  sessionId: null,
  sessionPurpose: 'unspecified',
  sessionStartedAt: null,
  sessionEndsAt: null,
  sessionTuning: null,
})

test('a satellite row carries the power saved for it and the power the driver has on', async () => {
  standing()
  ledgerOf(
    [desired(DEVICE, false), satellite('adapter1.frontend0', true)],
    [
      observedPower(DEVICE, 'terrestrial', false),
      observedPower('adapter1.frontend0', 'satellite', false),
    ],
  )

  const rows = (await screen()).rows

  assert.equal(rows[0]?.lnb, undefined)
  assert.deepEqual(rows[1]?.lnb, { saved: true, applied: false })
})

test('a satellite the driver has not described yet still carries the power saved for it', async () => {
  standing()
  ledgerOf([satellite('adapter1.frontend0', false)], [])

  assert.deepEqual((await screen()).rows[0]?.lnb, {
    saved: false,
    applied: undefined,
  })
})

test('turning the power on saves the ledger as it is saved, changing that one tuner alone', async () => {
  standing()
  ledgerOf(
    [
      desired(DEVICE, true),
      satellite('adapter1.frontend0', false),
      satellite('adapter2.frontend0', true),
    ],
    [
      observation(DEVICE, 'idle'),
      observation('adapter1.frontend0', 'disabled'),
    ],
  )

  assert.deepEqual(await setLnbPower('adapter1.frontend0', true), {
    state: 'ok',
  })
  assert.deepEqual(savedTuners(), [
    { deviceId: DEVICE, disabled: true, lnbPower: false },
    { deviceId: 'adapter1.frontend0', disabled: false, lnbPower: true },
    { deviceId: 'adapter2.frontend0', disabled: false, lnbPower: true },
  ])
})

test('turning the power off sends off for that tuner', async () => {
  standing()
  ledgerOf([satellite('adapter1.frontend0', true)])

  await setLnbPower('adapter1.frontend0', false)

  assert.deepEqual(savedTuners(), [
    { deviceId: 'adapter1.frontend0', disabled: false, lnbPower: false },
  ])
})

test('power for a tuner the saved ledger does not hold is not saved at all', async () => {
  standing()
  ledgerOf([satellite('adapter1.frontend0', false)])

  const result = await setLnbPower('adapter9.frontend0', true)

  assert.equal(result.state, 'rejected')
  assert.match(
    result.state === 'rejected' ? result.message : '',
    /adapter9\.frontend0 は保存された一覧にない/,
  )
  assert.equal(savedTuners(), undefined)
})

test('power is not saved when the ledger before it cannot be read', async () => {
  standing()
  store.ledgerStatus = 503

  assert.deepEqual(await setLnbPower('adapter1.frontend0', true), {
    state: 'rejected',
    message: '保存前の一覧を読み取れなかったため、保存していません(503)。',
  })
  assert.equal(savedTuners(), undefined)
})

test('power the API refuses is said in the words of why it refused', async () => {
  for (const [status, message, said] of [
    [409, 'unknownDevice: adapter1.frontend0', /もう一度検出してください/],
    [503, 'no driver', /driver に接続できない/],
    [400, 'malformed: x', /LNB 給電を保存できませんでした\(400\)/],
  ] as const) {
    standing()
    ledgerOf([satellite('adapter1.frontend0', false)])
    store.writeStatus = status
    store.writeOk = false
    store.writeMessage = message

    const result = await setLnbPower('adapter1.frontend0', true)

    assert.equal(result.state, 'rejected', message)
    assert.match(result.state === 'rejected' ? result.message : '', said)
  }

  standing()
  ledgerOf([satellite('adapter1.frontend0', false)])
  store.writeStatus = 401

  assert.deepEqual(await setLnbPower('adapter1.frontend0', true), {
    state: 'unauthenticated',
  })
})
