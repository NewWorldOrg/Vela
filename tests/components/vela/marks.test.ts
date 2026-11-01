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

test('the mark at the top left is drawn at 24px', async () => {
  assert.match(
    await read('components/vela/app-shell.tsx'),
    /<VelaMark className="size-6" \/>/,
  )
})

test('the marks are painted by the tokens, never by a colour of their own', async () => {
  const source = await read('components/vela/marks.tsx')
  assert.doesNotMatch(
    source,
    /(?:fill|stroke)="#[0-9A-Fa-f]{3,6}"/,
    'a colour of its own is written into the mark',
  )
  const mark = source.slice(source.indexOf('export function VelaMark('))

  assert.match(
    mark,
    /className="stroke-ink"/,
    'the strokes of the mark are not ink',
  )
  assert.match(
    mark,
    /className="fill-accent"/,
    'the dot of the mark is not the accent',
  )
})

test('the mark is the only drawing left, and the usher and the television under sail are gone', async () => {
  const source = await read('components/vela/marks.tsx')

  assert.deepEqual(
    [...source.matchAll(/export function (\w+)/g)].map(([, name]) => name),
    ['VelaMark'],
  )
  await assert.rejects(read('components/vela/answering-usher.tsx'))
  await assert.rejects(read('components/vela/spot-illustration.tsx'))
})
