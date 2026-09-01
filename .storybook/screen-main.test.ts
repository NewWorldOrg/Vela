import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

/**
 * How wide a screen is read is a step held by one shared part, and a screen
 * picks it by name. A screen that opens its own `<main>` picks nothing, so it
 * is as wide as the window — which is what every screen was until the step
 * existed, and what the next screen written from an old one would be again.
 *
 * Beside the two waiver scans for the same reason they are here: a rule the
 * run cannot measure is a rule the source has to be read for. The 44px probe
 * cannot see a control it was waived off, and no probe can see a screen that
 * never asked for a width.
 */
const OPENS_ITS_OWN = [
  // The step itself.
  'components/vela/app-shell.tsx',
  // Signed out, and outside the shell: a card in the middle of the window,
  // with no top bar and no column to be a share of.
  'components/login/login-page.tsx',
  'components/login/logged-out-page.tsx',
  // This file, which names the tag without opening one.
  '.storybook/screen-main.test.ts',
]

/** Build output and dependencies, which are not this repository's own source. */
const NOT_SOURCE = new Set([
  '.git',
  '.next',
  'node_modules',
  'storybook-static',
  'test-results',
])

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

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
