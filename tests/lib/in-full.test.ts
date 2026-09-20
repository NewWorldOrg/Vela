import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

import { tipTrigger } from '@/lib/in-full'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

const CLIPPED = 'block truncate text-note'

test('text that is only text is given a stop a keyboard can land on', () => {
  const given = tipTrigger(CLIPPED, false)

  assert.equal(
    given.tabIndex,
    0,
    'A span, a b or a code takes no focus of its own, so the tip opens for a ' +
      'mouse and for nobody else. The stop is what lets a keyboard reach it.',
  )
  assert.match(`${given.className}`, /\bcursor-help\b/)
  assert.match(`${given.className}`, /focus-visible:ring-\[3px\]/)
  assert.ok(
    CLIPPED.split(' ').every((one) => `${given.className}`.includes(one)),
    'the clipping the caller asked for was dropped on the way through',
  )
})

test('something already on the keyboard is left as it stands', () => {
  const given = tipTrigger('flex w-full', true)

  assert.deepEqual(
    given,
    {},
    'A button is already a stop. A second one puts the row on the tab order ' +
      'twice and takes two presses to pass.',
  )
})

test('the tip hands the stop to its child rather than wrapping it', async () => {
  const source = await readFile(
    path.join(ROOT, 'components/vela/in-full.tsx'),
    'utf8',
  )

  assert.match(
    source,
    /cloneElement\(\s*children,\s*tipTrigger\(children\.props\.className, alreadyFocusable\),\s*\)/,
    'InFull passes its child through untouched, so the child keeps whatever ' +
      'focus it had — which for a span is none at all.',
  )
  assert.match(source, /<TooltipContent/)
})

test('the live rows say they are already on the keyboard', async () => {
  const source = await readFile(
    path.join(ROOT, 'components/live/channel-in-full.tsx'),
    'utf8',
  )

  assert.match(source, /alreadyFocusable/)
})
