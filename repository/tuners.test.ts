import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

/**
 * The health threshold the tuner screen shows, and the write that changes it,
 * with the API standing in for itself. The screen used to hold a number of its
 * own here, so what these guard is that it now reads one.
 */

interface Sent {
  method: string
  path: string
  body?: Record<string, unknown>
}

const sent: Sent[] = []

const store: {
  ledger: unknown
  ledgerStatus: number
  health: unknown
  healthStatus: number
  writeStatus: number
  writeOk: boolean
} = {
  ledger: undefined,
  ledgerStatus: 200,
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
  systems: [],
  hoursOfSilence,
  undetermined: [],
})

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
            data: { status: true, message: '', data: null },
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

const { getTuners, setHoursOfSilence } = await import('./tuners.ts')

function standing(hoursOfSilence: number | string = 24): void {
  sent.length = 0
  store.ledger = ledger()
  store.ledgerStatus = 200
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

/**
 * The screen still has to say something when the setting cannot be read, and
 * what it says is the API's own default rather than a number invented here.
 */
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
