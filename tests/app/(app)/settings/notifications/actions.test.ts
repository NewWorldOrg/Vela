import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { beforeEach, mock, test } from 'node:test'

const CACHE = 'next/cache'

registerHooks({
  resolve(specifier, context, next) {
    return next(specifier === CACHE ? `${CACHE}.js` : specifier, context)
  },
})

const ONE = '0a000000-0000-4000-8000-000000000001'
const PAGE = '/settings/notifications'

const store: { status: number; said?: string } = { status: 200 }

const revalidated: string[] = []

async function answer() {
  const ok = store.status < 400

  return {
    data: ok ? { data: { delivered: true, failure: null } } : undefined,
    error: ok ? undefined : { message: store.said },
    response: { status: store.status, ok },
  }
}

const client = () => ({
  POST: answer,
  PATCH: answer,
  PUT: answer,
  DELETE: answer,
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

const {
  addDestination,
  addRuleSet,
  changeDestination,
  changeRuleSet,
  dropDestination,
  dropRuleSet,
  sendTrial,
  settleTheLead,
  turnDestination,
  turnRuleSet,
} = await import('@/app/(app)/settings/notifications/actions')

const RULES = {
  name: '見本のルールセット',
  enabled: true,
  events: [],
  destinations: [ONE],
}

beforeEach(() => {
  revalidated.length = 0
  store.status = 200
  store.said = undefined
})

test('every change the API took reads the page again', async () => {
  const written = await Promise.all([
    addDestination({
      name: '見本の送り先',
      url: 'https://webhook.example/one',
    }),
    changeDestination(ONE, { name: '見本の送り先', enabled: true }),
    turnDestination(ONE, false),
    dropDestination(ONE),
    addRuleSet(RULES),
    changeRuleSet(ONE, RULES),
    turnRuleSet(ONE, false),
    dropRuleSet(ONE),
    settleTheLead(3),
  ])

  assert.deepEqual(
    written,
    written.map(() => ({ state: 'ok' })),
  )
  assert.deepEqual(
    revalidated,
    written.map(() => PAGE),
  )
})

test('a trial says whether it arrived and reads the page again', async () => {
  assert.deepEqual(await sendTrial(ONE), {
    state: 'ok',
    delivered: true,
    failure: undefined,
  })
  assert.deepEqual(revalidated, [PAGE])
})

test('a change about a destination that is gone reads the page again', async () => {
  store.status = 404
  store.said = 'No destination is registered under that id.'

  assert.deepEqual(await dropDestination(ONE), {
    state: 'rejected',
    message: 'この送り先は残っていないため、削除できませんでした。',
  })
  assert.deepEqual(revalidated, [PAGE])
})

test('a change from a session that ended says so', async () => {
  store.status = 401

  assert.deepEqual(await turnRuleSet(ONE, true), { state: 'unauthenticated' })
})
