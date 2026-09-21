import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const THE_ROW = 'components/library/recording-row.tsx'

const WHERE_THE_WIDTH_IS_DECLARED = 'components/recordings/status-cell.tsx'

const WHERE_THE_PILL_IS_DRAWN = 'components/ui/badge.tsx'

const A_COLUMN_WIDTH = /width=\{([A-Z_]+_PILL_WIDTH)\}/

const A_CHIP = /<([A-Z][A-Za-z]*Chip)\b([^>]*)\/>/g

const CARRIES_A_CHIP = /<[A-Z][A-Za-z]*Chip\b/

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
    .filter((cell) => CARRIES_A_CHIP.test(cell.body))
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

test('every chip in a column is told the width of its column, by name', async () => {
  const told: string[] = []

  for (const cell of await cellsThatCarryChips()) {
    for (const chip of cell.body.matchAll(A_CHIP)) {
      told.push(chip[1])
      assert.match(
        chip[2],
        A_COLUMN_WIDTH,
        `${chip[1]} draws itself as wide as it likes: ${chip[0]}`,
      )
    }
  }

  assert.ok(told.length > 2, `only ${told.length} chips were read`)
})

test('the width a column is told is made from the words it can say', async () => {
  const source = await readFile(path.join(ROOT, THE_ROW), 'utf8')
  const cell = await readFile(
    path.join(ROOT, WHERE_THE_WIDTH_IS_DECLARED),
    'utf8',
  )
  const pill = await readFile(path.join(ROOT, WHERE_THE_PILL_IS_DRAWN), 'utf8')
  const names = new Set<string>()

  for (const told of source.matchAll(new RegExp(A_COLUMN_WIDTH, 'g'))) {
    names.add(told[1])
  }

  assert.ok(names.size > 2, `only ${names.size} column widths were read`)
  assert.match(cell, /export function pillWidthFor\(/)

  const chips = await Promise.all(
    (await sourceFiles('components/recordings')).map((file) =>
      readFile(path.join(ROOT, file), 'utf8'),
    ),
  )

  for (const name of names) {
    assert.ok(
      chips.some((chip) =>
        new RegExp(`export const ${name} = pillWidthFor\\(`).test(chip),
      ),
      `${name} is not made from its column's words`,
    )
  }

  assert.match(pill, /width = 'fit'/)
  assert.doesNotMatch(pill, /w-\[[\d.]+em\]/)
  assert.doesNotMatch(pill, /'w-full'/)
})

test('nothing but the pill itself is asked to fill the column', async () => {
  const wearing: string[] = []

  for (const dir of READ) {
    for (const file of await sourceFiles(dir)) {
      const source = await readFile(path.join(ROOT, file), 'utf8')

      if (/\[data-slot=badge\]/.test(source)) {
        wearing.push(file)
      }
    }
  }

  assert.deepEqual(wearing, [])
})
