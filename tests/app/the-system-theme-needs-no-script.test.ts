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

const read = (file: string) => readFile(path.join(ROOT, file), 'utf8')

test('following the device is decided by CSS, not by a script the page runs', async () => {
  const layout = await read('app/layout.tsx')

  assert.doesNotMatch(
    layout,
    /<script\b|<Script\b/,
    'a script in the layout is drawn again on the client every time the page is read again',
  )
  assert.match(layout, /'system'/)
})

test('the dark words apply under .dark, and under .system when the device is dark', async () => {
  const sheet = await read('app/globals.css')
  const variant = sheet.slice(
    sheet.indexOf('@custom-variant dark'),
    sheet.indexOf('@layer base'),
  )

  assert.match(variant, /&:where\(\.dark, \.dark \*\)/)
  assert.match(variant, /@media \(prefers-color-scheme: dark\)/)
  assert.match(variant, /&:where\(\.system, \.system \*\)/)
  assert.doesNotMatch(sheet, /^ {2}\.dark \{/m)
})

test('choosing a theme swaps the class on html and nothing else', async () => {
  const provider = await read('components/theme/ThemeProvider.tsx')

  assert.match(provider, /classList\.toggle\('dark', preference === 'dark'\)/)
  assert.match(
    provider,
    /classList\.toggle\('system', preference === 'system'\)/,
  )
})
