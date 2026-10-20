import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { beforeEach, mock, test } from 'node:test'

const NAVIGATION = 'next/navigation'

const STOOD_IN = 'vela-stand-in:next/navigation'

const CACHE = 'next/cache'

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === CACHE) {
      return next(`${CACHE}.js`, context)
    }

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

const store: { status: number; throwing: boolean } = {
  status: 200,
  throwing: false,
}

const revalidated: string[] = []

const client = () => ({
  PATCH: async () => {
    if (store.throwing) {
      throw new Error('the API is not there')
    }

    return { response: { status: store.status, ok: store.status < 400 } }
  },
})

mock.module('@/repository/client/carina', {
  namedExports: { carinaClient: client, revalidatingCarinaClient: client },
})

mock.module(CACHE, {
  namedExports: {
    revalidatePath: (path: string) => {
      revalidated.push(path)
    },
  },
})

const { chooseTheVersion, leaveTheVersionToLearning, settleTheSkipThreshold } =
  await import('@/app/(app)/settings/segments/actions')

beforeEach(() => {
  revalidated.length = 0
  store.status = 200
  store.throwing = false
})

test('a change the API took reads the page again', async () => {
  assert.deepEqual(await chooseTheVersion(2), { state: 'ok' })
  assert.deepEqual(await leaveTheVersionToLearning(), { state: 'ok' })
  assert.deepEqual(await settleTheSkipThreshold(0.65), { state: 'ok' })
  assert.deepEqual(revalidated, [
    '/settings/segments',
    '/settings/segments',
    '/settings/segments',
  ])
})

test('a change that was refused leaves the page as it was drawn', async () => {
  store.status = 409

  assert.deepEqual(await chooseTheVersion(2), { state: 'learningOff' })
  assert.deepEqual(await leaveTheVersionToLearning(), { state: 'learningOff' })

  store.status = 400

  assert.deepEqual(await settleTheSkipThreshold(0.97), { state: 'outOfRange' })

  store.status = 200
  store.throwing = true

  assert.deepEqual(await settleTheSkipThreshold(0.65), { state: 'notSaved' })
  assert.deepEqual(revalidated, [])
})
