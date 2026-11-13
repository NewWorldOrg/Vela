import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import {
  formatMoment,
  formatMomentSpan,
  formatRecentMoment,
} from '@/lib/format'

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
  cardReader: Reply
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
  cardReader: { status: 501 },
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

        if (path === '/api/driver/card-reader') {
          return replying(store.cardReader)
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
      PUT: async (template: string, init?: Asking) => {
        sent.push({
          method: 'PUT',
          path: pathOf(template, init),
          body: init?.body,
        })

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
  store.cardReader = { status: 501 }
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

  assert.equal(
    (await screen()).rows[0]?.lastService?.at,
    formatRecentMoment(SEEN_AT),
  )
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
        { label: 'チャンネルへ', href: '/settings/channels#system-isdbT' },
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

test('a system a tuner receives but that has no service at all is said to have none', async () => {
  standing()
  observing('satellite')
  store.health = {
    ...health(24),
    systems: [
      reaching('isdbSBs', 'unmeasured', null, 0),
      reaching('isdbSCs110', 'unmeasured', null, 0),
    ],
  }

  assert.deepEqual((await screen()).notices, [
    {
      tone: 'warn',
      body: 'BSのサービスが 0 件です。',
      actions: [
        { label: 'チャンネルへ', href: '/settings/channels#system-isdbSBs' },
      ],
    },
    {
      tone: 'warn',
      body: 'CS110のサービスが 0 件です。',
      actions: [
        {
          label: 'チャンネルへ',
          href: '/settings/channels#system-isdbSCs110',
        },
      ],
    },
  ])
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

const THE_LEDGER_DISAGREES =
  "The ledger calls 'adapter0.frontend0' a terrestrial tuner and the tuner reports that it receives satellite."

test("a tuner the ledger disagrees with says both kinds in the screen's words and not the sentence the driver wrote", async () => {
  standing()
  observedAs({
    state: 'faulted',
    health: 'faulted',
    detail: THE_LEDGER_DISAGREES,
    healthDetail: THE_LEDGER_DISAGREES,
    faultKind: 'ledgerDisagrees',
    faultDeclaredKind: 'terrestrial',
    faultReceivableKinds: ['satellite'],
  })

  const row = (await screen()).rows[0]

  assert.equal(row?.stateLabel, '異常')
  assert.equal(
    row?.stateSub,
    '一覧では地上波、このチューナーが受信できるのは衛星。一致するまで割り当てられない。',
  )
})

test("each way the driver takes a tuner out of service is said in the screen's words", async () => {
  for (const [faultKind, said] of [
    [
      'deviceFailed',
      '使用中にデバイスが応答しなくなった。開き直せた時点で割り当てが戻る。',
    ],
    [
      'deviceFailedAgain',
      '戻した直後にデバイスがまた応答しなくなった。間を延ばして開き直し、開けた時点で割り当てが戻る。',
    ],
    [
      'repeatedTuneFailure',
      '違うチャンネルで続けて選局できなかった。開き直せた時点で割り当てが戻る。',
    ],
  ] as const) {
    standing()
    observedAs({
      health: 'faulted',
      healthDetail: A_DEVICE_TURNED_OFF,
      faultKind,
      faultDeclaredKind: null,
      faultReceivableKinds: [],
    })

    const row = (await screen()).rows[0]

    assert.equal(row?.stateLabel, '異常')
    assert.equal(row?.stateSub, said)
  }
})

test("a way of taking a tuner out of service the driver did not name, or this build does not know, says the reason is not known yet and never the driver's sentence", async () => {
  for (const faultKind of ['overheated', 'unspecified', undefined]) {
    standing()
    observedAs({
      state: 'faulted',
      detail: A_DEVICE_TURNED_OFF,
      faultKind,
      faultReceivableKinds: [],
    })

    const row = (await screen()).rows[0]

    assert.equal(row?.stateLabel, '異常')
    assert.equal(row?.stateSub, '理由はまだ分からない。')
  }
})

test("a tuner that has failed to tune a channel says so in the screen's words", async () => {
  standing()
  observedAs({
    health: 'degraded',
    healthDetail: A_DEVICE_TURNED_OFF,
    degradedKind: 'tuneFailing',
  })

  const row = (await screen()).rows[0]

  assert.equal(row?.stateLabel, '警告')
  assert.equal(
    row?.stateSub,
    '選局に失敗したチャンネルがある。違うチャンネルでも続けて失敗すると割り当てが止まる。',
  )
})

test("a tuner the driver warns about without naming why says the reason is not known yet and never the driver's sentence", async () => {
  for (const degradedKind of ['runningHot', 'unspecified', undefined]) {
    standing()
    observedAs({
      health: 'degraded',
      healthDetail: A_DEVICE_TURNED_OFF,
      degradedKind,
    })

    const row = (await screen()).rows[0]

    assert.equal(row?.stateLabel, '警告')
    assert.equal(row?.stateSub, '理由はまだ分からない。')
  }
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
      message: '時間をおいてからもう一度お試しください。',
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
      message: '時間をおいてからもう一度お試しください。',
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
    message:
      '保存前の一覧を読み取れなかったため、保存できませんでした。時間をおいてからもう一度お試しください。',
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
    [
      400,
      'somethingNew: x',
      /保存できませんでした。時間をおいてからもう一度お試しください。/,
    ],
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

const switchedPower = () =>
  sent.filter((one) => one.method === 'PUT' && one.path.endsWith('/lnb-power'))

test('turning the power on names that one tuner and the flag, and nothing else', async () => {
  standing()
  ledgerOf([desired(DEVICE, true), satellite('adapter1.frontend0', false)])

  assert.deepEqual(await setLnbPower('adapter1.frontend0', true), {
    state: 'ok',
  })
  assert.deepEqual(switchedPower(), [
    {
      method: 'PUT',
      path: '/api/tuners/adapter1.frontend0/lnb-power',
      body: { lnbPower: true },
    },
  ])
  assert.equal(savedTuners(), undefined)
})

test('turning the power off does not read the ledger to write it back whole', async () => {
  standing()

  await setLnbPower('adapter1.frontend0', false)

  assert.deepEqual(sent, [
    {
      method: 'PUT',
      path: '/api/tuners/adapter1.frontend0/lnb-power',
      body: { lnbPower: false },
    },
  ])
})

test('two satellites switched one after the other each send only their own flag', async () => {
  standing()

  await setLnbPower('adapter1.frontend0', true)
  await setLnbPower('adapter2.frontend0', true)

  assert.deepEqual(
    switchedPower().map(({ path, body }) => [path, body]),
    [
      ['/api/tuners/adapter1.frontend0/lnb-power', { lnbPower: true }],
      ['/api/tuners/adapter2.frontend0/lnb-power', { lnbPower: true }],
    ],
  )
})

test('power the API refuses is said in the words of why it refused', async () => {
  for (const [status, message, said] of [
    [404, 'noSuchTuner: adapter1.frontend0', /保存された一覧にない/],
    [501, 'capabilityMissing', /対応していない/],
    [503, 'no driver', /driver に接続できない/],
    [
      400,
      'rejected: x',
      /LNB 給電を保存できませんでした。時間をおいてからもう一度お試しください。/,
    ],
  ] as const) {
    standing()
    store.writeStatus = status
    store.writeOk = false
    store.writeMessage = message

    const result = await setLnbPower('adapter1.frontend0', true)

    assert.equal(result.state, 'rejected', message)
    assert.match(result.state === 'rejected' ? result.message : '', said)
  }

  standing()
  store.writeStatus = 401

  assert.deepEqual(await setLnbPower('adapter1.frontend0', true), {
    state: 'unauthenticated',
  })
})

test('saving a detection carries the version of the ledger it read', async () => {
  standing()
  ledgerOf([desired(DEVICE, false)])

  await saveDetectedTuners([DEVICE])

  const put = sent.findLast((one) => one.method === 'PUT')

  assert.equal(put?.body?.savedHash, 'a')
})

test('a detection saved over a ledger that changed since it was read is refused with a way on', async () => {
  standing()
  store.writeStatus = 409
  store.writeOk = false
  store.writeMessage =
    'ledgerChanged: The ledger has been saved since this one was read.'

  assert.deepEqual(await saveDetectedTuners([DEVICE]), {
    state: 'rejected',
    message:
      'チューナーの一覧が保存のあいだに変わったため、保存できませんでした。検出し直してから保存してください。',
  })
})

const HARDWARE = {
  name: 'Example ISDB-T frontend',
  kernelDriver: 'example_dvb',
  bus: 'pci',
  devicePath: '/dev/dvb/adapter0/frontend0',
  usbPort: null,
  present: true,
  lastSeenAt: SEEN_AT,
}

function observingWith(fields: Record<string, unknown>): void {
  observing('terrestrial')
  const held = store.ledger as { observed: Record<string, unknown>[] }
  held.observed[0] = { ...held.observed[0], ...fields }
}

test('a tuner is named by its hardware and placed by its driver and path', async () => {
  standing()
  observingWith({ hardware: HARDWARE, machine: null })

  const [row] = (await screen()).rows

  assert.equal(row.name, 'Example ISDB-T frontend')
  assert.equal(row.place, 'example_dvb · /dev/dvb/adapter0/frontend0')
  assert.equal(row.machine, undefined)
  assert.deepEqual(row.status, {
    word: '空き',
    tone: 'plain',
    line: `${formatRecentMoment(SEEN_AT)} に確認`,
  })
})

test('a usb tuner is placed by the port it hangs on', async () => {
  standing()
  observingWith({
    hardware: {
      ...HARDWARE,
      name: 'Example USB tuner',
      kernelDriver: null,
      bus: 'usb',
      devicePath: '/dev/bus/usb/001/002',
      usbPort: '1-2',
    },
  })

  assert.equal((await screen()).rows[0].place, 'usb 1-2')
})

test('a synthetic tuner is called one, having no name of its own', async () => {
  standing()
  observingWith({
    hardware: {
      ...HARDWARE,
      name: null,
      kernelDriver: null,
      bus: 'synthetic',
      devicePath: null,
    },
  })

  const [row] = (await screen()).rows

  assert.equal(row.name, '偽のチューナー')
  assert.equal(row.place, undefined)
})

test('a tuner from a driver that names no hardware has no name and keeps the reception time', async () => {
  standing()
  observing('terrestrial')
  store.health = {
    ...(health(24) as Record<string, unknown>),
    systems: [reaching('isdbT', 'reaching', SEEN_AT)],
  }

  const [row] = (await screen()).rows

  assert.equal(row.name, undefined)
  assert.equal(row.status.line, `${formatRecentMoment(SEEN_AT)} に受信`)
})

test('a tuner gone from its place is said to be missing whatever the driver held it as', async () => {
  standing()
  observingWith({
    hardware: { ...HARDWARE, present: false },
    state: 'faulted',
    health: 'faulted',
    faultKind: 'deviceFailed',
  })

  assert.deepEqual((await screen()).rows[0].status, {
    word: '見当たらない',
    tone: 'err',
    line: `${formatRecentMoment(SEEN_AT)} に確認`,
  })
})

test('a tuner of another machine that has stopped answering is said not to connect', async () => {
  standing()
  observingWith({
    hardware: HARDWARE,
    machine: 'example-machine',
    state: 'faulted',
    health: 'faulted',
  })

  const [row] = (await screen()).rows

  assert.equal(row.machine, 'example-machine')
  assert.equal(row.status.word, 'つながらない')
  assert.equal(row.status.tone, 'err')
})

test('a tuner recording says so in red with the programme and when it ends', async () => {
  standing()
  const endsAt = '2026-08-08T10:30:00Z'
  observingWith({
    hardware: HARDWARE,
    state: 'busy',
    sessionId: 'rec-1',
    sessionPurpose: 'recording',
    sessionEndsAt: endsAt,
    sessionTitle: 'Example Programme',
  })

  const [row] = (await screen()).rows

  assert.equal(row.session?.title, 'Example Programme')
  assert.deepEqual(row.status, {
    word: '録画中',
    tone: 'rec',
    line: 'Example Programme',
    until: `${formatRecentMoment(endsAt)} まで`,
  })
})

test('a disabled tuner says so quietly', async () => {
  standing()
  observingWith({ hardware: HARDWARE, state: 'disabled' })

  assert.equal((await screen()).rows[0].status.word, '無効')
  assert.equal((await screen()).rows[0].status.tone, 'plain')
})

test("the driver's version, start and name come from its greeting", async () => {
  standing()
  store.driver = {
    connection: 'connected',
    hello: {
      protocolVersion: 1,
      instanceId: 'b7f2c9',
      capabilities: [],
      draining: false,
      version: '0.3.7',
      startedAt: '2026-08-08T03:40:00Z',
      name: 'example-machine',
    },
    observedAt: SEEN_AT,
  }

  const result = await screen()

  assert.deepEqual(result.facts, {
    version: '0.3.7',
    startedAt: formatMoment('2026-08-08T03:40:00Z'),
    respondedAt: formatRecentMoment(SEEN_AT),
    machine: 'example-machine',
  })
})

test('a driver that gives no version leaves the facts empty', async () => {
  standing()

  assert.deepEqual((await screen()).facts, {})
})

test('a driver that gives no version is still said to have answered', async () => {
  standing()
  store.driver = {
    connection: 'connected',
    hello: {
      protocolVersion: 1,
      instanceId: 'b7f2c9',
      capabilities: [],
      draining: false,
    },
    observedAt: SEEN_AT,
  }

  assert.deepEqual((await screen()).facts, {
    respondedAt: formatRecentMoment(SEEN_AT),
  })
})

test('a driver that does not answer for its reader leaves the reader off the screen', async () => {
  standing()

  assert.equal((await screen()).cardReaders, undefined)
})

const READER = {
  use: 'local',
  state: 'inserted',
  problem: null,
  readers: [{ name: 'Example Reader', state: 'inserted', inUse: true }],
  lenderHostName: null,
  leasesOut: null,
  lastAnsweredAt: SEEN_AT,
  checkedAt: SEEN_AT,
}

const answering = (reader: Record<string, unknown>): Reply => ({
  status: 200,
  body: { status: true, message: '', data: reader },
})

test('the reader the card answered in says it is in use and when the card last answered', async () => {
  standing()
  store.cardReader = answering(READER)

  assert.deepEqual((await screen()).cardReaders, [
    {
      id: 'reader-0',
      title: 'Example Reader',
      sub: '使用中',
      status: {
        word: '挿入',
        tone: 'ok',
        line: `${formatRecentMoment(SEEN_AT)} に応答`,
      },
    },
  ])
})

test('a reader without a card asks for a hand in amber', async () => {
  standing()
  store.cardReader = answering({
    ...READER,
    state: 'empty',
    readers: [{ name: 'Example Reader', state: 'empty', inUse: false }],
  })

  const [reader] = (await screen()).cardReaders ?? []

  assert.equal(reader.status.word, '未挿入')
  assert.equal(reader.status.tone, 'warn')
  assert.equal(reader.status.line, `${formatRecentMoment(SEEN_AT)} に確認`)
})

test('a smart-card service that is down is said in red with its reason', async () => {
  standing()
  store.cardReader = answering({
    ...READER,
    state: 'unresponsive',
    problem: 'serviceDown',
    readers: [],
  })

  const [reader] = (await screen()).cardReaders ?? []

  assert.equal(reader.status.word, '応答なし · pcscd が止まっています')
  assert.equal(reader.status.tone, 'err')
})

test('a card that will not answer is said in red with its reason', async () => {
  standing()
  store.cardReader = answering({
    ...READER,
    state: 'unresponsive',
    problem: 'cardSilent',
    readers: [{ name: 'Example Reader', state: 'unresponsive', inUse: false }],
  })

  assert.equal(
    (await screen()).cardReaders?.[0].status.word,
    '応答なし · カードが答えません',
  )
})

test('no reader attached is one row saying so', async () => {
  standing()
  store.cardReader = answering({ ...READER, state: 'noReader', readers: [] })

  const readers = (await screen()).cardReaders ?? []

  assert.equal(readers.length, 1)
  assert.equal(readers[0].status.word, 'リーダーなし')
  assert.equal(readers[0].status.tone, 'warn')
})

test('a borrowed card names the lender and whether it can be reached', async () => {
  standing()
  store.cardReader = answering({
    ...READER,
    use: 'borrowed',
    state: 'borrowed',
    problem: 'lenderUnreachable',
    readers: [],
    lenderHostName: 'example-lender',
  })

  const [reader] = (await screen()).cardReaders ?? []

  assert.equal(reader.title, 'example-lender')
  assert.equal(reader.status.word, '借用中 · 貸し手に届きません')
  assert.equal(reader.status.tone, 'err')
})

test('a driver that descrambles nothing says so in one quiet row', async () => {
  standing()
  store.cardReader = answering({
    ...READER,
    use: 'none',
    state: 'notUsed',
    readers: [],
    lastAnsweredAt: null,
  })

  const readers = (await screen()).cardReaders ?? []

  assert.equal(readers.length, 1)
  assert.equal(readers[0].status.word, '復号しない')
  assert.equal(readers[0].status.tone, 'plain')
})

test('a card lent to other tuners says how many', async () => {
  standing()
  store.cardReader = answering({ ...READER, leasesOut: 2 })

  assert.equal((await screen()).cardReaders?.[0].sub, '使用中 · 貸し出し 2')
})

test('a device found anew is named by its hardware so it can be told apart before it is kept', async () => {
  standing()
  store.ledger = ledger()
  store.detected = {
    status: 200,
    body: {
      status: true,
      message: '',
      data: {
        devices: [
          {
            deviceId: 'usb1-2',
            detection: 'detected',
            kinds: ['terrestrial'],
            detail: null,
            machine: null,
            hardware: {
              ...HARDWARE,
              name: 'Example USB tuner',
              kernelDriver: null,
              bus: 'usb',
              devicePath: '/dev/bus/usb/001/002',
              usbPort: '1-2',
            },
          },
        ],
        added: ['usb1-2'],
        missing: [],
        mismatched: [],
      },
    },
  }

  const answer = await getDetectedTuners()

  assert.equal(answer.state, 'ok')
  const [row] = answer.state === 'ok' ? answer.detection.rows : []
  assert.equal(row.name, 'Example USB tuner')
  assert.equal(row.place, 'usb 1-2')
})
