import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

/**
 * `data-tap-exempt` takes a control out of the 44px probe in test-runner.ts,
 * so every use of it is a control nobody measures — the one way past that gate
 * that leaves the run green. The probe cannot police its own waiver, because a
 * waived control is exactly the one it never looks at. This does.
 *
 * SPEC's 触れる大きさ leaves one opening and closes the rest by name: a
 * programme cell is as tall as the programme is long, and making it 44px would
 * make the time axis a lie. Rows that sit against one another grow to 44px
 * instead of being waived, and a replaced element is wrapped in a label that
 * carries the area instead of being waived. So the list below is the whole of
 * it, and a new entry is a design-system change before it is a code change.
 */
const WAIVED = ['components/guide/program-cell.tsx']

/**
 * Files that name the attribute without waiving anything — the probe that
 * honours it, and this test. Named rather than skipped by directory, so that a
 * waiver written into a decorator or a preview is still caught.
 */
const NAMES_IT = ['.storybook/test-runner.ts', '.storybook/tap-exempt.test.ts']

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

    if (/\.(ts|tsx|css|mjs|json)$/.test(entry.name)) {
      found.push(relative)
    }
  }

  return found
}

test('the 44px probe is waived where SPEC says, and nowhere else', async () => {
  const files = await sourceFiles('.')
  assert.ok(
    files.length > 100,
    `only ${files.length} source files were walked, so this test is reading the wrong tree`,
  )

  const uses: string[] = []
  for (const file of files) {
    const text = await readFile(path.join(ROOT, file), 'utf8')
    if (text.includes('data-tap-exempt')) {
      uses.push(file)
    }
  }

  assert.deepEqual(
    uses.sort(),
    [...WAIVED, ...NAMES_IT].sort(),
    'A control was taken out of the 44px probe somewhere SPEC does not allow ' +
      'it, or the probe stopped honouring the attribute. Grow the row, or wrap ' +
      'the field in a label that carries the area — see the 触れる大きさ ' +
      'section of the design system.',
  )
})
