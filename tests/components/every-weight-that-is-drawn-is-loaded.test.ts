import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

const THE_FONT_LINKS = ['app/layout.tsx', '.storybook/preview-head.html']

test('the code face is loaded at the bold weight the screens draw it in', async () => {
  for (const file of THE_FONT_LINKS) {
    const source = await readFile(path.join(ROOT, file), 'utf8')

    assert.match(
      source,
      /family=M\+PLUS\+1\+Code:wght@400;500;700/,
      `${file} leaves bold figures to be smeared into a false bold`,
    )
  }
})

test('a weight that was not loaded is never faked by smearing the glyphs', async () => {
  const sheet = await readFile(path.join(ROOT, 'app/globals.css'), 'utf8')
  const body = sheet.slice(sheet.indexOf('  body {\n    font-family'))

  assert.match(body.slice(0, body.indexOf('}')), /font-synthesis-weight: none;/)
})

test('a small kana or a long vowel mark never starts a line', async () => {
  const sheet = await readFile(path.join(ROOT, 'app/globals.css'), 'utf8')
  const body = sheet.slice(sheet.indexOf('  body {\n    font-family'))

  assert.match(body.slice(0, body.indexOf('}')), /line-break: strict;/)
})
