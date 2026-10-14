import assert from 'node:assert/strict'
import { test } from 'node:test'

test("every page lets its frames load only from Vela's own origin, where the Hybridcast relay is, and its policy says nothing more", async () => {
  const { default: config } = await import('@/next.config')

  assert.deepEqual(await config.headers?.(), [
    {
      source: '/:path*',
      headers: [{ key: 'Content-Security-Policy', value: "frame-src 'self'" }],
    },
  ])
})
