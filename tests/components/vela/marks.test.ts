import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
)

const read = (file: string) => readFile(path.join(ROOT, file), 'utf8')

test('the mark at the top left is drawn in its small cut', async () => {
  assert.match(
    await read('components/vela/app-shell.tsx'),
    /<VelaMark small className="size-5" \/>/,
  )
})

test('the mark is the keel and the sail crossing in the star, painted by its own tokens', async () => {
  const source = await read('components/vela/marks.tsx')
  assert.doesNotMatch(
    source,
    /(?:fill|stroke)="#[0-9A-Fa-f]{3,6}"/,
    'a colour of its own is written into the mark',
  )
  const mark = source.slice(source.indexOf('export function VelaMark('))

  assert.match(mark, /d=\{KEEL\} className="stroke-\(--mark-keel\)"/)
  assert.match(mark, /d=\{SAIL\} className="stroke-\(--mark-sail\)"/)
  assert.match(mark, /className="stroke-\(--mark-star\)"\s+mask=/)
})

test('the mark keeps the colours of the app icon in both themes', async () => {
  const tokens = await read('app/globals.css')
  const icon = await read('app/icon.svg')

  for (const colour of [
    '#356fa5',
    '#3f6461',
    '#efb440',
    '#8fc0ea',
    '#96bbb4',
  ]) {
    assert.match(tokens, new RegExp(`--mark-[a-z]+: ${colour};`))
    assert.match(icon.toLowerCase(), new RegExp(colour))
  }
})

test('the mark and the television under sail of the loading curtain are the only drawings, and the usher is gone', async () => {
  const source = await read('components/vela/marks.tsx')

  assert.deepEqual(
    [...source.matchAll(/export function (\w+)/g)].map(([, name]) => name),
    ['VelaMark', 'TelevisionBoat'],
  )
  await assert.rejects(read('components/vela/answering-usher.tsx'))
  await assert.rejects(read('components/vela/spot-illustration.tsx'))
})
