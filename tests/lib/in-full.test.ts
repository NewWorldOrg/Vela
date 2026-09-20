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
    /cloneElement\(\s*children,\s*tipTrigger\(children\.props\.className, alreadyFocusable\)/,
    'InFull passes its child through untouched, so the child keeps whatever ' +
      'focus it had — which for a span is none at all.',
  )
  assert.match(source, /<TooltipContent/)
})

test('a child that is not an element is wrapped before it is read', async () => {
  const source = await readFile(
    path.join(ROOT, 'components/vela/in-full.tsx'),
    'utf8',
  )

  assert.match(
    source,
    /isValidElement<Tipped>\(children\)\s*\?/,
    'InFull reads children.props with nothing asked first. A string, a ' +
      'number, and the child a Server Component hands across the boundary ' +
      'all arrive without props, and reading className off nothing is the ' +
      '500 the quality screen answered with.',
  )
  assert.match(
    source,
    /<span \{\.\.\.tipTrigger\(undefined, alreadyFocusable\)\}>\{children\}<\/span>/,
    'A child with no props of its own is dropped instead of being given a ' +
      'box of its own to be the stop.',
  )
})

test('a wrapped child is given the same stop as an element child', () => {
  const given = tipTrigger(undefined, false)

  assert.equal(
    given.tabIndex,
    0,
    'the box put around a plain string takes no focus, so the tip stays shut ' +
      'for a keyboard',
  )
  assert.match(`${given.className}`, /\bcursor-help\b/)
  assert.match(`${given.className}`, /focus-visible:ring-\[3px\]/)
})

test('the screen that answered 500 draws its rows on the client', async () => {
  const source = await readFile(
    path.join(ROOT, 'components/quality/quality-trend.tsx'),
    'utf8',
  )

  assert.match(
    source,
    /^'use client'/,
    'The trend panel hands InFull a child it builds on the server, which ' +
      'crosses the boundary without props and is drawn in a box of its own ' +
      'instead — and a box of its own does not clip, so the name spills over ' +
      'the column it was given.',
  )
  assert.match(source, /<InFull says=\{row\.name\}>/)
})

test('the live rows say they are already on the keyboard', async () => {
  const source = await readFile(
    path.join(ROOT, 'components/live/channel-in-full.tsx'),
    'utf8',
  )

  assert.match(source, /alreadyFocusable/)
})
