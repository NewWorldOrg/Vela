import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

/**
 * The integrity list and the walk it can be asked for, with the API standing in
 * for itself. Only the module that reaches the network is replaced; naming a
 * fault, weighing a file and reading a refusal all run for real.
 */

interface Sent {
  method: string
  path: string
  query: Record<string, unknown>
}

const sent: Sent[] = []

const store: {
  listing: unknown
  listingStatus: number
  roots: unknown
  storageStatus: number
  sweep: unknown
  sweepError: unknown
  sweepStatus: number
} = {
  listing: undefined,
  listingStatus: 200,
  roots: undefined,
  storageStatus: 200,
  sweep: undefined,
  sweepError: undefined,
  sweepStatus: 200,
}

interface Over {
  [key: string]: unknown
}

const answered = (status: number) => ({ status, ok: status < 400 })

const check = (over: Over = {}) => ({
  id: '5e2c4f7a-1d3b-4a58-9c2e-7b16f0a4d9c1',
  startedAt: '2026-08-08T18:10:00Z',
  finishedAt: '2026-08-08T18:10:04Z',
  rootsWalked: 2,
  rootsOutOfReach: 0,
  filesRead: 214,
  ledgerRowsRead: 212,
  ledgerRowsJudged: 211,
  ledgerRowsStillWriting: 1,
  ledgerRowsInRootsOutOfReach: 0,
  ...over,
})

const finding = (over: Over = {}) => ({
  id: 'f0d3b1c8-42a7-4d10-9e6b-5c8a2f7e1b30',
  fault: 'sizeDisagrees',
  outputRoot: 'primary',
  path: 'recording-4790.m2ts',
  recordingId: '4790',
  ledgerSize: 22331551744,
  observedSize: 8142336,
  noticedAt: '2026-08-08T18:10:00Z',
  ...over,
})

const listing = (items: unknown[], over: Over = {}) => ({
  check: check(),
  items,
  total: items.length,
  currentPage: 1,
  lastPage: 1,
  perPage: 200,
  ...over,
})

const root = (over: Over = {}) => ({
  name: 'primary',
  freeBytes: 127048298496,
  totalBytes: 481493131264,
  writable: true,
  committedBytes: 162582071,
  recordingsInFlight: 1,
  shortfall: null,
  ...over,
})

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({
      GET: async (path: string, init?: { params?: { query?: object } }) => {
        sent.push({
          method: 'GET',
          path,
          query: (init?.params?.query ?? {}) as Record<string, unknown>,
        })

        if (path === '/api/storage') {
          return store.storageStatus === 200
            ? {
                data: { status: true, message: '', data: store.roots },
                response: answered(200),
              }
            : { data: undefined, response: answered(store.storageStatus) }
        }

        return store.listingStatus === 200
          ? {
              data: { status: true, message: '', data: store.listing },
              response: answered(200),
            }
          : {
              data: { status: false, message: '読めません', data: null },
              error: { status: false, message: '読めません', data: null },
              response: answered(store.listingStatus),
            }
      },
      POST: async (path: string) => {
        sent.push({ method: 'POST', path, query: {} })

        return store.sweepStatus === 200
          ? {
              data: { status: true, message: '', data: store.sweep },
              response: answered(200),
            }
          : {
              data: undefined,
              error: { status: false, message: '', data: store.sweepError },
              response: answered(store.sweepStatus),
            }
      },
    }),
    revalidatingCarinaClient: () => {
      throw new Error('the integrity list does not revalidate')
    },
  },
})

const { getIntegrity, runIntegrityCheck } = await import('./integrity.ts')

function standing(items: unknown[] = [finding()], over: Over = {}): void {
  sent.length = 0
  store.listing = listing(items, over)
  store.listingStatus = 200
  store.roots = { roots: [root()] }
  store.storageStatus = 200
  store.sweep = { check: check(), findings: items.length }
  store.sweepError = undefined
  store.sweepStatus = 200
}

const only = async (over: Over = {}) => {
  standing([finding(over)])

  const result = await getIntegrity()

  assert.equal(result.findings.length, 1)

  return result.findings[0]
}

test('each fault the sweep can raise is given a reason of its own', async () => {
  const faults = [
    'sizeDisagrees',
    'noLedgerRow',
    'fileMissing',
    'fileEmpty',
    'emptyThoughComplete',
  ] as const
  const reasons = new Set<string>()

  for (const fault of faults) {
    const one = await only({ fault })

    assert.equal(one.fault, fault)
    assert.notEqual(one.reason, '')
    reasons.add(one.reason)
  }

  assert.equal(reasons.size, faults.length)
})

test('a reason is spelled in the words the recording screens use', async () => {
  const one = await only({ fault: 'noLedgerRow' })

  assert.match(one.reason, /録画の記録/)
  assert.doesNotMatch(one.reason, /台帳/)
})

test('a file is weighed as the bytes it is, and the row it disagrees with', async () => {
  const one = await only()

  assert.equal(one.size, '8,142,336 B')
  assert.equal(one.sizeNote, '録画の記録では 22,331,551,744 B')
})

test('an orphan has no row to disagree with, and says nothing in its place', async () => {
  const one = await only({
    fault: 'noLedgerRow',
    recordingId: null,
    ledgerSize: null,
    observedSize: 1776412000,
  })

  assert.equal(one.recordingId, undefined)
  assert.equal(one.sizeNote, undefined)
  assert.equal(one.size, '1,776,412,000 B')
})

test('a file that is gone is not weighed as empty', async () => {
  const one = await only({
    fault: 'fileMissing',
    observedSize: null,
    ledgerSize: 15032385536,
  })

  assert.equal(one.size, '—')
  assert.equal(one.sizeNote, '録画の記録では 15,032,385,536 B')
})

test('a file that is empty is weighed, and reads as zero rather than as nothing', async () => {
  const one = await only({ fault: 'fileEmpty', observedSize: 0 })

  assert.equal(one.size, '0 B')
})

/**
 * The API hands a finding a fresh id on every walk, so a row is keyed by where
 * the file is instead. Two walks over the same file agree on the key.
 */
test('a row is keyed by where the file is, not by the id the walk gave it', async () => {
  const first = await only({ id: 'aaaaaaaa-0000-4000-8000-000000000001' })
  const again = await only({ id: 'bbbbbbbb-0000-4000-8000-000000000002' })

  assert.equal(first.key, again.key)
  assert.equal(first.key, 'primary/recording-4790.m2ts')
})

test('two files of the same name under different roots are told apart', async () => {
  standing([
    finding({ outputRoot: 'primary' }),
    finding({ outputRoot: 'secondary' }),
  ])

  const { findings } = await getIntegrity()

  assert.equal(new Set(findings.map((one) => one.key)).size, 2)
})

test('the check that walked is reported with what it read', async () => {
  standing()

  const { check: walked } = await getIntegrity()

  assert.equal(walked?.filesRead, 214)
  assert.equal(walked?.ledgerRowsJudged, 211)
  assert.equal(walked?.ledgerRowsStillWriting, 1)
  assert.equal(walked?.ranAt, '08/09 03:10')
})

test('a list that has never been walked answers without a check', async () => {
  standing([], { check: null })

  const { check: walked, findings } = await getIntegrity()

  assert.equal(walked, undefined)
  assert.deepEqual(findings, [])
})

test('the roots are read beside the findings', async () => {
  standing()

  const { roots, storageProblem } = await getIntegrity()

  assert.equal(storageProblem, undefined)
  assert.deepEqual(roots, [
    {
      name: 'primary',
      free: '127,048,298,496 B',
      total: '481,493,131,264 B',
      writable: true,
      recordingsInFlight: 1,
    },
  ])
})

test('roots that will not be read do not take the findings down with them', async () => {
  standing()
  store.storageStatus = 503

  const { roots, findings, storageProblem } = await getIntegrity()

  assert.deepEqual(roots, [])
  assert.equal(findings.length, 1)
  assert.match(String(storageProblem), /空き容量/)
})

test('a list that will not be read is an error, not an empty list', async () => {
  standing()
  store.listingStatus = 500

  await assert.rejects(() => getIntegrity(), /読めません/)
})

test('a walk asked for by hand answers with how many it found', async () => {
  standing()
  store.sweep = { check: check(), findings: 3 }

  const result = await runIntegrityCheck()

  assert.deepEqual(result, { state: 'ok', findings: 3 })
  assert.ok(
    sent.some(
      (one) =>
        one.method === 'POST' && one.path === '/api/recordings/integrity/run',
    ),
  )
})

test('a walk refused because one is already walking says so', async () => {
  standing()
  store.sweepStatus = 409
  store.sweepError = {
    refusal: 'oneIsAlreadyRunning',
    runningCheckId: '5e2c4f7a-1d3b-4a58-9c2e-7b16f0a4d9c1',
    notBefore: null,
  }

  const result = await runIntegrityCheck()

  assert.equal(result.state, 'refused')
  assert.match(result.state === 'refused' ? result.message : '', /走っています/)
})

test('a walk refused as too soon names when the next one may be asked for', async () => {
  standing()
  store.sweepStatus = 409
  store.sweepError = {
    refusal: 'tooSoonAfterTheLastOne',
    runningCheckId: null,
    notBefore: '2026-08-08T18:15:00Z',
  }

  const result = await runIntegrityCheck()

  assert.equal(result.state, 'refused')
  assert.match(
    result.state === 'refused' ? result.message : '',
    /次に実行できるのは 08\/09 03:15 です。/,
  )
})

test('a refusal that says nothing falls back to the status it answered with', async () => {
  standing()
  store.sweepStatus = 500
  store.sweepError = null

  const result = await runIntegrityCheck()

  assert.equal(result.state, 'refused')
  assert.match(result.state === 'refused' ? result.message : '', /\(500\)/)
})
