import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const SCRIPT = readFileSync('scripts/fetch-denpa-font.sh', 'utf8')

function pinned(name: string): string {
  const match = new RegExp(`^${name}=(\\S+)$`, 'm').exec(SCRIPT)

  assert.ok(match, `${name} is pinned in scripts/fetch-denpa-font.sh`)

  return match[1]
}

test('the bundled Denpa Font is the release the fetch script pins', () => {
  const bytes = readFileSync('public/fonts/denpa-font.woff2')
  const sha256 = createHash('sha256').update(bytes).digest('hex')

  assert.match(pinned('VERSION'), /^v\d+\.\d+$/)
  assert.equal(sha256, pinned('WOFF2_SHA256'))
})

test('the licence of the bundled font travels with it', () => {
  const licence = readFileSync(
    'scripts/third-party-notices/fonts/denpa-font.woff2.txt',
    'utf8',
  )

  assert.match(licence, /SIL OPEN FONT LICENSE Version 1\.1/)
})
