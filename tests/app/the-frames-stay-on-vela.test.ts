import assert from 'node:assert/strict'
import { test } from 'node:test'

test("every page lets its frames load only from Vela's own origin, where the Hybridcast relay is, and its policy says nothing more", async () => {
  const { default: config } = await import('@/next.config')

  const rules = (await config.headers?.()) ?? []

  assert.deepEqual(
    rules.filter(({ source }) => source === '/:path*'),
    [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-src 'self'" },
        ],
      },
    ],
  )
})
