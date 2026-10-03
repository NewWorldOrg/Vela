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

const THE_ICONS = 'components/vela/icons.tsx'

const THE_CATALOGUE = 'stories/foundations/Icons.stories.tsx'

test('every icon the app draws is laid out in the catalogue', async () => {
  const icons = await readFile(path.join(ROOT, THE_ICONS), 'utf8')
  const catalogue = await readFile(path.join(ROOT, THE_CATALOGUE), 'utf8')
  const drawn = [...icons.matchAll(/^export function (\w+)\(/gm)].map(
    ([, name]) => name,
  )

  assert.ok(
    drawn.length > 50,
    `only ${drawn.length} icons were read, so this test is reading the wrong file`,
  )
  assert.deepEqual(
    drawn.filter((name) => !catalogue.includes(`Icons.${name}`)),
    [],
    'these icons are drawn on a screen and shown nowhere in the catalogue, ' +
      'so nobody looks at them side by side with the rest of the set',
  )
})
