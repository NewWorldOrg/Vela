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

const BROWSER = '0a000000-0000-4000-8000-000000000003'

const FINGERPRINT =
  '5b1e0c7d3f6a9b2e4c8d1f0a7e6b5c4d3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d'

const store: { status: number; down: boolean } = { status: 200, down: false }

const row = {
  id: BROWSER,
  name: '見本のブラウザ',
  kind: 'push',
  tail: '',
  fingerprint: FINGERPRINT,
  enabled: true,
  readable: true,
  lastResultAt: null,
  lastFailure: null,
  createdAt: '2026-01-01T00:00:00Z',
  changedAt: '2026-01-01T00:00:00Z',
}

async function answer(path: string) {
  if (store.down) {
    throw new Error('the API is not there')
  }

  const ok = store.status < 400
  const data =
    path === '/api/notifications/destinations'
      ? {
          items: [
            { ...row, id: 'slack', kind: 'slack', fingerprint: null },
            row,
          ],
        }
      : row

  return {
    data: ok ? { status: true, message: '', data } : undefined,
    error: ok ? undefined : { status: false, message: '', data: null },
    response: { status: store.status, ok },
  }
}

const client = () => ({ GET: answer, PUT: answer })

mock.module('@/repository/client/carina', {
  namedExports: { carinaClient: client, revalidatingCarinaClient: client },
})

const { putSubscription, readBrowserRows } =
  await import('@/app/(app)/_shell/actions')

beforeEach(() => {
  store.status = 200
  store.down = false
})

test('the browser rows are read by their ids and fingerprints', async () => {
  assert.deepEqual(await readBrowserRows(), [
    { id: BROWSER, fingerprint: FINGERPRINT },
  ])
})

test('rows that cannot be read are nothing, never an error to someone opening the app', async () => {
  store.status = 503

  assert.equal(await readBrowserRows(), undefined)

  store.down = true

  assert.equal(await readBrowserRows(), undefined)
})

test('a subscription is put to its row and the row is named back', async () => {
  assert.deepEqual(
    await putSubscription(BROWSER, {
      endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token',
      keys: { p256dh: 'BSampleP256dh', auth: 'sampleAuth' },
    }),
    { state: 'ok', id: BROWSER },
  )
})
