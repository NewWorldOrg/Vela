import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

import { CURTAIN_HOLD_MS, CURTAIN_IDLE } from '@/lib/curtain'

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

function theCurtainIn(sheet: string): string {
  const at = sheet.indexOf('@utility curtain {')

  return sheet.slice(at, sheet.indexOf('\n}\n', at))
}

function keyframesIn(sheet: string, name: string): string {
  const at = sheet.indexOf(`@keyframes ${name} {`)

  assert.ok(at >= 0, `${name} is not declared`)

  return sheet.slice(at, sheet.indexOf('\n}\n', at))
}

test('with the motion stopped the curtain is not drawn at all, without waiting for a script', async () => {
  const rule = theCurtainIn(await read('app/globals.css'))
  const curtain = await read('components/vela/curtain.tsx')

  assert.match(curtain, /className="curtain /)
  assert.match(
    rule,
    /prefers-reduced-motion: reduce\)[\s\S]*:root:not\(\[data-motion='moves'\]\) & \{\s*display: none;/,
  )
  assert.match(rule, /:root\[data-motion='still'\] & \{\s*display: none;/)
})

test('the curtain never takes a press from the page under it', async () => {
  assert.match(
    await read('components/vela/curtain.tsx'),
    /className="curtain pointer-events-none /,
  )
})

test('without a script the curtain still opens after its hold, which the script only cuts short', async () => {
  const rule = theCurtainIn(await read('app/globals.css'))
  const hold = rule.match(/--curtain-hold: ([\d.]+)s;/)

  assert.ok(hold, 'the curtain does not say how long it waits closed')
  assert.equal(Number(hold[1]) * 1000, CURTAIN_HOLD_MS)

  for (const one of rule.matchAll(/animation:([^;]*);/g)) {
    if (one[1].includes(CURTAIN_IDLE)) {
      continue
    }
    assert.match(
      one[1],
      /var\(--curtain-hold\)/,
      `${one[1].trim()} starts before the hold, so a script that cuts the hold short leaves it behind`,
    )
  }

  const curtain = await read('components/vela/curtain.tsx')

  assert.match(curtain, /running\.currentTime = CURTAIN_HOLD_MS/)
  assert.match(curtain, /!== CURTAIN_IDLE/)
})

test('once its motion has run, nothing of the curtain is left over the page', async () => {
  const sheet = await read('app/globals.css')

  for (const [name, end] of [
    ['curtain-side', /100% \{\s*transform: translateX\(var\(--out\)\);/],
    ['curtain-valance', /100% \{\s*transform: translateY\(-170%\);/],
    ['curtain-cord', /100% \{\s*transform: translateY\(-100cqh\);/],
    ['curtain-usher-z', /100% \{[^}]*opacity: 0;/],
    ['curtain-twinkle', /100% \{\s*opacity: 0;/],
    ['curtain-dock', /100% \{\s*opacity: 0;/],
  ] as const) {
    assert.match(keyframesIn(sheet, name), end, `${name} ends over the page`)
  }

  assert.match(
    theCurtainIn(sheet),
    /--out: calc\(var\(--fold-pinch\) \* -14\.4 - 180px\);/,
    'the folds are not carried further out than the bundle they are tied into',
  )
})
