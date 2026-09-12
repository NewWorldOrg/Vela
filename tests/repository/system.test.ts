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
  status: number
  throwing: boolean
} = { version: { version: '2.4.1' }, status: 200, throwing: false }

const answer = async (path: string) => {
  if (path !== '/api/version') {
    return { data: { data: null }, response: { status: 200 } }
  }

  if (store.throwing) {
    throw new Error('the API is not there')
  }

  return { data: { data: store.version }, response: { status: store.status } }
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
  store.status = 200
  store.throwing = false
  Object.assign(store, over)
}

test('the version the API answers with is what the screen is given', async () => {
  standing()

  assert.deepEqual((await getSystemStatus()).carinaVersion, {
    state: 'ok',
    value: '2.4.1',
  })
})

test('a caller the API does not know is told to sign in, not that there is no version', async () => {
  standing({ status: 401, version: null })

  assert.deepEqual((await getSystemStatus()).carinaVersion, {
    state: 'unauthenticated',
  })
})

test('an API that answers without a version leaves the version unread', async () => {
  standing({ version: null })

  assert.deepEqual((await getSystemStatus()).carinaVersion, {
    state: 'unavailable',
  })
})

test('an API that cannot be reached leaves the version unread', async () => {
  standing({ throwing: true })

  assert.deepEqual((await getSystemStatus()).carinaVersion, {
    state: 'unavailable',
  })
})
