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

test('whether the curtain is down is decided by the request, so the first HTML already has it', async () => {
  const layout = await read('app/(app)/layout.tsx')

  assert.match(layout, /cookies\(\)/)
  assert.match(layout, /curtainAsked\(/)
})

test('the curtain is never lowered in the browser over a page that has been drawn', async () => {
  const curtain = await read('components/vela/curtain.tsx')

  assert.doesNotMatch(
    curtain,
    /sessionStorage|localStorage|useLayoutEffect|useEffect|matchMedia/,
    'a curtain decided after hydration closes over the page the server already drew',
  )
})
