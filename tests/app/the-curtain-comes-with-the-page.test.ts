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

test('with the motion stopped the curtain is not drawn at all, without waiting for a script', async () => {
  const sheet = await read('app/globals.css')
  const curtain = await read('components/vela/curtain.tsx')
  const rule = sheet.slice(
    sheet.indexOf('@utility curtain {'),
    sheet.indexOf('@utility curtain-panel {'),
  )

  assert.match(curtain, /className="curtain /)
  assert.match(
    rule,
    /prefers-reduced-motion: reduce\)[\s\S]*:root:not\(\[data-motion='moves'\]\) & \{\s*display: none;/,
  )
  assert.match(rule, /:root\[data-motion='still'\] & \{\s*display: none;/)
})

test('once its motion has run, nothing of the curtain is left over the page', async () => {
  const sheet = await read('app/globals.css')
  const panel = sheet.slice(
    sheet.indexOf('@keyframes curtain-panel'),
    sheet.indexOf('@keyframes curtain-line'),
  )
  const line = sheet.slice(
    sheet.indexOf('@keyframes curtain-line'),
    sheet.indexOf('@keyframes stamp'),
  )

  assert.match(sheet, /--animate-curtain-panel: curtain-panel [^;]* both;/)
  assert.match(sheet, /--animate-curtain-line: curtain-line [^;]* both;/)
  assert.match(panel, /100% \{\s*transform: translateX\(var\(--curtain-away/)
  assert.match(line, /100% \{[^}]*opacity: 0;/)
})
