import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { velaVersion } from '@/lib/version'

const declared = process.env.VELA_VERSION

const { version: packaged } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string }

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

test('a build that was handed no version is refused rather than answered as blank', () => {
  delete process.env.VELA_VERSION

  assert.throws(() => velaVersion())

  process.env.VELA_VERSION = '   '

  assert.throws(() => velaVersion())
})

test('the build hands over the version package.json carries and spells none of its own', async () => {
  const { default: config } = await import('@/next.config')

  const source = readFileSync(
    new URL('../../next.config.ts', import.meta.url),
    'utf8',
  )

  assert.equal(config.env?.VELA_VERSION, packaged)
  assert.equal(source.includes(packaged), false)
})

test('the versions the Storybook screens are drawn with are the declared one', async () => {
  const { SYSTEM_CENSUS, VELA_VERSION } =
    await import('@/repository/system.fixtures')

  assert.equal(VELA_VERSION, packaged)
  assert.equal(SYSTEM_CENSUS.carinaVersion, packaged)
})
