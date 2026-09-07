import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const WAIVED = ['components/guide/program-cell.tsx']

const NAMES_IT = [
  '.storybook/test-runner.ts',
  'tests/storybook/tap-exempt.test.ts',
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
