import assert from 'node:assert/strict'
import { test } from 'node:test'

test('the notification worker is served from the root and asked for anew each time, so a new one reaches the browser', async () => {
  const { default: config } = await import('@/next.config')
  const rules = (await config.headers?.()) ?? []

  assert.deepEqual(
    rules.find(({ source }) => source === '/sw.js'),
    {
      source: '/sw.js',
      headers: [{ key: 'Cache-Control', value: 'no-cache' }],
    },
  )
})

test('the policy every page carries names no worker source, so the worker from the root is not blocked', async () => {
  const { default: config } = await import('@/next.config')
  const rules = (await config.headers?.()) ?? []
  const policies = rules.flatMap(({ headers }) =>
    headers
      .filter(({ key }) => key === 'Content-Security-Policy')
      .map(({ value }) => value),
  )

  for (const policy of policies) {
    assert.doesNotMatch(policy, /worker-src|script-src|child-src|default-src/)
  }
})
