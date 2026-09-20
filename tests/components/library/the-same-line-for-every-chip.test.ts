import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const THE_ROW = 'components/library/recording-row.tsx'

const WHERE_THE_WIDTH_IS_DECLARED = 'components/recordings/status-cell.tsx'

const THE_WIDTH_RULE = '[data-slot=badge]'

const A_CHIP = /<[A-Z][A-Za-z]*Chip\b/

const A_CELL = /<td\b([^>]*)>([\s\S]*?)<\/td>/g

const READ = ['app', 'components', 'stories']

const NOT_SOURCE = new Set([
  '.git',
  '.next',
  'node_modules',
  'storybook-static',
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

    if (/\.tsx?$/.test(entry.name)) {
      found.push(relative)
    }
  }

  return found
}

async function cellsThatCarryChips() {
  const source = await readFile(path.join(ROOT, THE_ROW), 'utf8')

  return [...source.matchAll(A_CELL)]
    .map((cell) => ({ declared: cell[1].trim(), body: cell[2] }))
    .filter((cell) => A_CHIP.test(cell.body))
}

test('every column that carries a chip goes through the one cell', async () => {
  const carrying = await cellsThatCarryChips()

  assert.ok(
    carrying.length > 1,
    'the library row is expected to carry chips in more than one column',
  )

  for (const cell of carrying) {
    assert.match(cell.body, /<StatusCell\b/)
  }
})

test('the cells that carry chips are declared the same way', async () => {
  const carrying = await cellsThatCarryChips()

  assert.equal(
    new Set(carrying.map((cell) => cell.declared)).size,
    1,
    `the chip columns are declared ${carrying
      .map((cell) => cell.declared)
      .join(' / ')}`,
  )
})

test('the width a chip takes in its column is declared in one file', async () => {
  const written: string[] = []

  for (const dir of READ) {
    for (const file of await sourceFiles(dir)) {
      if (
        (await readFile(path.join(ROOT, file), 'utf8')).includes(THE_WIDTH_RULE)
      ) {
        written.push(file)
      }
    }
  }

  assert.deepEqual(written, [WHERE_THE_WIDTH_IS_DECLARED])
})
