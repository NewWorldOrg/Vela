import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const OPENS_ITS_OWN = [
  'components/vela/app-shell.tsx',
  'components/login/login-page.tsx',
  'components/login/logged-out-page.tsx',
  'tests/storybook/screen-main.test.ts',
]

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

    if (/\.(ts|tsx)$/.test(entry.name)) {
      found.push(relative)
    }
  }

  return found
}

test('a screen takes its width from the shared part, not from a <main> of its own', async () => {
  const files = await sourceFiles('.')
  assert.ok(
    files.length > 100,
    `only ${files.length} source files were walked, so this test is reading the wrong tree`,
  )

  const opens: string[] = []
  for (const file of files) {
    if (/<main[\s>]/.test(await readFile(path.join(ROOT, file), 'utf8'))) {
      opens.push(file)
    }
  }

  assert.deepEqual(
    opens.sort(),
    [...OPENS_ITS_OWN].sort(),
    'A screen opened a <main> of its own, which takes it out of the width ' +
      'steps and leaves it as wide as the window. Render `ScreenMain` and ' +
      'pick a step by name — `full` is for a screen whose content is an axis.',
  )
})

test('a screen does not make its <main> the scroller', async () => {
  const files = await sourceFiles('.')
  const scrolls: string[] = []

  for (const file of files) {
    const source = await readFile(path.join(ROOT, file), 'utf8')
    for (const opening of source.matchAll(
      /<(ScreenMain|AdminMain)\b[^>]*>/gs,
    )) {
      if (/overflow-(y-)?(auto|scroll)/.test(opening[0])) {
        scrolls.push(file)
      }
    }
  }

  assert.deepEqual(
    scrolls,
    [],
    'A screen gave its <main> an overflow, which makes the column the ' +
      'scroller. Leave `ScreenMain` alone and let the document scroll, or ' +
      'pick `scroll="within"` and give the list inside its own scroller.',
  )
})
