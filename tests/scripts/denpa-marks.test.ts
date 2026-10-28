import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const SCRIPT = readFileSync('scripts/denpa-marks.sh', 'utf8')
const STYLES = readFileSync('app/globals.css', 'utf8')
const DOCKERFILE = readFileSync('Dockerfile', 'utf8')

function face(): string {
  const found = /@font-face\s*{[^}]*font-family:\s*'Denpa Font'[^}]*}/.exec(
    STYLES,
  )

  assert.ok(found, 'app/globals.css declares the Denpa Font face')

  return found[0]
}

function rangesOf(text: string): string[] {
  return text.split(',').map((range) => range.trim().toUpperCase())
}

test('the marks are cut to the characters the page draws in Denpa Font, and no others', () => {
  const cut = /^UNICODE_RANGE='([^']+)'$/m.exec(SCRIPT)
  const drawn = /unicode-range:\s*([^;]+);/.exec(face())

  assert.ok(cut, 'scripts/denpa-marks.sh names the ranges it cuts')
  assert.ok(drawn, 'the face is held to a unicode-range')
  assert.deepEqual(rangesOf(cut[1]), rangesOf(drawn[1]))
})

test('the page reads the marks, and the whole font only where the marks were not built', () => {
  const sources = [...face().matchAll(/url\('([^']+)'\)/g)].map(
    ([, url]) => url,
  )

  assert.deepEqual(sources, [
    '/fonts/denpa-marks.woff2',
    '/fonts/denpa-font.woff2',
  ])
})

test('the image cuts the marks from the pinned font, with tools of pinned versions and hashes', () => {
  const requirements = readFileSync(
    'scripts/denpa-marks/requirements.txt',
    'utf8',
  )

  assert.match(DOCKERFILE, /^FROM python:\S+ AS marks$/m)
  assert.match(DOCKERFILE, /--require-hashes -r requirements\.txt/)
  assert.match(
    DOCKERFILE,
    /^COPY --from=marks \S+ public\/fonts\/denpa-marks\.woff2$/m,
  )

  for (const line of requirements.split('\n').filter((l) => /^\w/.test(l))) {
    assert.match(line, /^[\w-]+==[\d.]+ /, line)
  }

  assert.match(requirements, /--hash=sha256:[0-9a-f]{64}/)
})

test('the licence of the marks travels with them', () => {
  const licence = readFileSync(
    'scripts/third-party-notices/fonts/denpa-marks.woff2.txt',
    'utf8',
  )

  assert.match(licence, /SIL OPEN FONT LICENSE Version 1\.1/)
  assert.match(
    readFileSync('THIRD-PARTY-NOTICES.md', 'utf8'),
    /\| `public\/fonts\/denpa-marks\.woff2` \|/,
  )
})
