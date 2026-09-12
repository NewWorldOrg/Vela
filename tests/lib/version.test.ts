import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { velaVersion } from '@/lib/version'

const declared = process.env.VELA_VERSION

test.afterEach(() => {
  if (declared === undefined) {
    delete process.env.VELA_VERSION
  } else {
    process.env.VELA_VERSION = declared
  }
})

test('the version is the one the build was handed', () => {
  process.env.VELA_VERSION = '2.4.1'

  assert.equal(velaVersion(), '2.4.1')
})

test('a build that was handed no version says nothing rather than an empty string', () => {
  delete process.env.VELA_VERSION

  assert.equal(velaVersion(), null)

  process.env.VELA_VERSION = '   '

  assert.equal(velaVersion(), null)
})

test('the build takes the version from package.json and nowhere else', async () => {
  const { default: config } = await import('@/next.config')
  const { version } = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { version: string }

  assert.equal(config.env?.VELA_VERSION, version)
})
