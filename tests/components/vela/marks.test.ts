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

test('the mark at the top left is the small cut', async () => {
  assert.match(
    await read('components/vela/app-shell.tsx'),
    /<VelaMark small className="size-4" \/>/,
  )
})

test('the marks are painted by the tokens, never by a colour of their own', async () => {
  const source = await read('components/vela/marks.tsx')
  const painted = [...source.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{3,6})"/g)]

  assert.deepEqual(
    [...new Set(painted.map(([, colour]) => colour))].sort(),
    ['#000', '#fff'],
    'a colour other than the black and white of a mask is written into the marks',
  )
  for (const token of ['stroke-brand', 'stroke-sky', 'stroke-spark']) {
    assert.match(source, new RegExp(token))
  }
  for (const token of ['fill-brand', 'fill-sky', 'fill-spark']) {
    assert.match(source, new RegExp(token))
  }
})

test('the usher moves once, and not for someone who stopped the motion', async () => {
  const sheet = await read('app/globals.css')

  assert.match(sheet, /--animate-twinkle: twinkle [^;]*both;/)
  assert.doesNotMatch(sheet, /--animate-twinkle: [^;]*infinite/)
  assert.equal(
    sheet.match(/--animate-twinkle: none;/g)?.length,
    2,
    'the star keeps twinkling for someone who asked for no motion',
  )
})

test('the drawings the usher replaced are gone', async () => {
  await assert.rejects(read('components/vela/spot-illustration.tsx'))
})
