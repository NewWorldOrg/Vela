import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const WAIVED: string[] = []

const KEEPS_DEFAULT = [
  "components/ui/select.tsx | 'flex cursor-default items-center justify-center py-1',",
  "components/ui/select.tsx | 'flex cursor-default items-center justify-center py-1',",
]

const SHUT = [
  "components/guide/collection-drawer.tsx | data-cursor-shut={!open ? 'the drawer is shut' : undefined}",
]

const NAMES_EXEMPT = new Set([
  '.storybook/test-runner.ts',
  'tests/storybook/cursor-exempt.test.ts',
])
const NAMES_DEFAULT = new Set(['tests/storybook/cursor-exempt.test.ts'])
const NAMES_SHUT = new Set([
  '.storybook/test-runner.ts',
  'tests/storybook/cursor-exempt.test.ts',
])

const NOT_SOURCE = new Set([
  '.git',
  '.next',
  'node_modules',
  'storybook-static',
  'test-results',
])

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

async function sourceFiles(dir: string): Promise<string[]> {
  const found: string[] = []

  for (const entry of await readdir(path.join(ROOT, dir), {
    withFileTypes: true,
  })) {
    const relative = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!NOT_SOURCE.has(entry.name)) {
        found.push(...(await sourceFiles(relative)))
      }
      continue
    }

    if (/\.(ts|tsx|css|mjs|json)$/.test(entry.name)) {
      found.push(relative)
    }
  }

  return found
}

async function linesCarrying(
  mark: string,
  onlyNames: Set<string>,
): Promise<string[]> {
  const files = await sourceFiles('.')
  assert.ok(
    files.length > 100,
    `only ${files.length} source files were walked, so this test is reading the wrong tree`,
  )

  const uses: string[] = []
  for (const file of files) {
    if (onlyNames.has(file)) {
      continue
    }
    for (const line of (await readFile(path.join(ROOT, file), 'utf8')).split(
      '\n',
    )) {
      if (line.includes(mark)) {
        uses.push(`${file} | ${line.trim()}`)
      }
    }
  }

  return uses.sort()
}

test('the pointer probe is waived where SPEC says, and nowhere else', async () => {
  assert.deepEqual(
    await linesCarrying('data-cursor-exempt', NAMES_EXEMPT),
    [...WAIVED].sort(),
    'A control was taken out of the pointer probe somewhere SPEC does not ' +
      'allow it, or the probe stopped honouring the attribute. Say ' +
      '`cursor-pointer` on it instead — see the 触れる感触 section of the ' +
      'design system.',
  )
})

test('nothing tells the pointer to stay a plain arrow but the two SPEC names', async () => {
  assert.deepEqual(
    await linesCarrying('cursor-default', NAMES_DEFAULT),
    [...KEEPS_DEFAULT].sort(),
    'Something that can be pressed was told to keep the plain arrow. That is ' +
      "shadcn's default for the rows of a list and a menu, and it is the " +
      'reason the rows here read as unpressable for as long as they did.',
  )
})

test('only a drawer the screen has shut is out of the probe’s reach', async () => {
  assert.deepEqual(
    await linesCarrying('data-cursor-shut', NAMES_SHUT),
    [...SHUT].sort(),
    'Something was marked as a shut drawer, which takes its controls out of ' +
      'the probe without a word. Only a drawer that is `inert` while it is ' +
      'closed may carry it, and only while it is closed.',
  )
})
