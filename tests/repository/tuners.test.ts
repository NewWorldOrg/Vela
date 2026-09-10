import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

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
} = {
  ledger: undefined,
  ledgerStatus: 200,
  driver: null,
  health: undefined,
  healthStatus: 200,
  writeStatus: 200,
  writeOk: true,
}

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
          data: { status: store.writeOk, message: '', data: null },
          response: answered(store.writeStatus),
        }
      },
    }),
    revalidatingCarinaClient: () => {
      throw new Error('the tuner ledger does not revalidate')
    },
  },
})

const { getTuners, setHoursOfSilence } = await import('@/repository/tuners')

function standing(hoursOfSilence: number | string = 24): void {
  sent.length = 0
  store.ledger = ledger()
  store.ledgerStatus = 200
  store.driver = null
  store.health = health(hoursOfSilence)
  store.healthStatus = 200
  store.writeStatus = 200
  store.writeOk = true
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

  assert.equal((await screen()).rows[0]?.lastService?.at, '08/09 03:00')
})

test('how long ago it was seen is counted from the moment it was read', async () => {
  standing()
  observing('terrestrial')
  store.health = {
    ...health(24),
    systems: [
      reaching(
        'isdbT',
        'reaching',
        new Date(Date.now() - 7200000).toISOString(),
      ),
    ],
  }

  assert.equal((await screen()).rows[0]?.lastService?.ago, '2 時間前')
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
      body: '地上波のサービスをいま受信できていません。最後に受信したのは 08/09 03:00 です。',
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
