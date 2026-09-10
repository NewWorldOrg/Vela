import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

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
  '..',
)

async function sourceFiles(dir: string): Promise<string[]> {
  const found: string[] = []

  for (const entry of await readdir(path.join(ROOT, dir), {
    withFileTypes: true,
  })) {
    const relative = path.posix.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!NOT_SOURCE.has(entry.name)) {
        found.push(...(await sourceFiles(relative)))
      }
      continue
    }

    if (/\.tsx$/.test(entry.name)) {
      found.push(relative)
    }
  }

  return found
}

function openings(source: string): string[] {
  const found: string[] = []

  for (const start of source.matchAll(/<EmptyState\b/g)) {
    let depth = 0
    let quote: string | null = null

    for (let at = start.index; at < source.length; at += 1) {
      const here = source[at]

      if (quote !== null) {
        if (here === quote) {
          quote = null
        }
        continue
      }

      if (here === '"' || here === "'") {
        quote = here
      } else if (here === '{') {
        depth += 1
      } else if (here === '}') {
        depth -= 1
      } else if (here === '>' && depth === 0) {
        found.push(source.slice(start.index, at + 1))
        break
      }
    }
  }

  return found
}

test('the empty box takes the width it is given rather than its content', async () => {
  const source = await readFile(
    path.join(ROOT, 'components/vela/empty-state.tsx'),
    'utf8',
  )

  assert.match(
    source,
    /\bw-full\b/,
    'The empty box no longer states a width of its own. Without one it is ' +
      'laid out at the width of its text, and any auto margin around it — ' +
      'its own, or one a screen adds to centre it — collapses it to a ' +
      'column narrower than the design calls for.',
  )
})

test('a screen does not centre the empty box itself', async () => {
  const files = await sourceFiles('.')

  assert.ok(
    files.length > 100,
    `only ${files.length} source files were walked, so this test is reading the wrong tree`,
  )

  const centres: string[] = []
  for (const file of files) {
    const source = await readFile(path.join(ROOT, file), 'utf8')

    for (const opening of openings(source)) {
      if (/\bmx-auto\b/.test(opening)) {
        centres.push(file.replace(/^\.\//, ''))
      }
    }
  }

  assert.deepEqual(
    centres,
    [],
    'A screen passed an auto side margin to the empty box. The box already ' +
      'centres itself inside whatever cap it is given, and adding the margin ' +
      'from outside is what once shrank it to the width of its own text in ' +
      'every column-laid screen. Pass the cap alone.',
  )
})
