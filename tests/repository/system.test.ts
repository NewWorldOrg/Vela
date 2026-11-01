import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { mock, test } from 'node:test'

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

const store: {
  version: unknown
  throwing: boolean
  driver: unknown
} = { version: { version: '2.4.1' }, throwing: false, driver: null }

const answer = async (path: string) => {
  if (path === '/api/driver/status') {
    return {
      data: { status: store.driver !== null, message: '', data: store.driver },
      response: { status: 200 },
    }
  }

  if (path !== '/api/version') {
    return { data: { data: null }, response: { status: 200 } }
  }

  if (store.throwing) {
    throw new Error('the API is not there')
  }

  return { data: { data: store.version }, response: { status: 200 } }
}

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({ GET: answer }),
    revalidatingCarinaClient: () => ({ GET: answer }),
  },
})

const { getSystemStatus } = await import('@/repository/system')

function standing(over: Partial<typeof store> = {}): void {
  store.version = { version: '2.4.1' }
  store.throwing = false
  store.driver = null
  Object.assign(store, over)
}

test('the version the API answers with is what the screen is given', async () => {
  standing()

  assert.equal((await getSystemStatus()).carinaVersion, '2.4.1')
})

test('an API that answers without a version leaves the row with nothing to show', async () => {
  standing({ version: null })

  assert.equal((await getSystemStatus()).carinaVersion, null)
})

test('an API that cannot be reached leaves the row with nothing to show', async () => {
  standing({ throwing: true })

  assert.equal((await getSystemStatus()).carinaVersion, null)
})

const DRIVER = {
  connection: 'connected',
  hello: {
    protocolVersion: 1,
    instanceId: 'b7f2c9',
    capabilities: [],
    draining: false,
    version: '0.3.7',
    startedAt: null,
    name: null,
  },
  appProtocolVersion: 1,
  missingCapabilities: [],
  driverUpdateRequired: false,
  observedAt: '2026-08-08T18:00:00Z',
}

test("the driver's own version is what the screen is given beside the app's", async () => {
  standing({ driver: DRIVER })

  const status = await getSystemStatus()

  assert.equal(status.driver.state, 'ok')
  assert.equal(
    status.driver.state === 'ok'
      ? status.driver.status.hello?.version
      : undefined,
    '0.3.7',
  )
})

test('a driver that gives no version leaves it empty', async () => {
  standing({ driver: { ...DRIVER, hello: { ...DRIVER.hello, version: null } } })

  const status = await getSystemStatus()

  assert.equal(
    status.driver.state === 'ok'
      ? status.driver.status.hello?.version
      : 'unread',
    undefined,
  )
})
