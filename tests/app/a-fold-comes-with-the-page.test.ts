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

const THE_PAGES_THAT_FOLD = [
  'app/(app)/guide/page.tsx',
  'app/(app)/live/page.tsx',
]

test('a remembered fold is kept where the server can read it', async () => {
  const flag = await read('hooks/useStoredFlag.ts')

  assert.doesNotMatch(
    flag,
    /localStorage|sessionStorage/,
    'a fold only the browser knows is drawn open by the server and closes after hydration',
  )
})

test('the pages that fold draw the remembered fold in their first HTML', async () => {
  for (const page of THE_PAGES_THAT_FOLD) {
    assert.match(await read(page), /cookies\(\)/, page)
  }
})
