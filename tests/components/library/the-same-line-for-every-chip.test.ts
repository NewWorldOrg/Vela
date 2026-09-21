import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const THE_ROW = 'components/library/recording-row.tsx'

const THE_TABLE = 'components/library/recordings-table.tsx'

const WHERE_THE_WIDTH_IS_DECLARED = 'components/recordings/status-cell.tsx'

const WHERE_THE_PILL_IS_DRAWN = 'components/ui/badge.tsx'

const A_CHIP = /<([A-Z][A-Za-z]*Chip)\b([^>]*)\/>/g

const CARRIES_A_CHIP = /<[A-Z][A-Za-z]*Chip\b/

const A_CELL = /<td\b([^>]*)>([\s\S]*?)<\/td>/g

const SAYS_IT_AS_A_COLUMN = /(^|\s)say(\s|$|=)/

const A_COLUMN_WIDTH = /width:\s*([A-Z_]+_COLUMN)\b/g

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

test('every column that carries a state goes through the one cell', async () => {
  const carrying = await cellsThatCarryChips()

  assert.ok(
    carrying.length > 1,
    'the library row is expected to say a state in more than one column',
  )

  for (const cell of carrying) {
    assert.match(cell.body, /<StatusCell\b/)
  }
})

test('the cells that carry a state are declared the same way', async () => {
  const carrying = await cellsThatCarryChips()

  assert.equal(
    new Set(carrying.map((cell) => cell.declared)).size,
    1,
    `the state columns are declared ${carrying
      .map((cell) => cell.declared)
      .join(' / ')}`,
  )
})

test('a state in a column is said as a dot and a word, not drawn as a pill', async () => {
  const said: string[] = []

  for (const cell of await cellsThatCarryChips()) {
    for (const chip of cell.body.matchAll(A_CHIP)) {
      said.push(chip[1])
      assert.match(
        chip[2],
        SAYS_IT_AS_A_COLUMN,
        `${chip[1]} still draws a pill inside a column: ${chip[0]}. A state ` +
          'in a table is a 6px dot and a word, with no outline and no fill',
      )
    }
  }

  assert.ok(said.length > 2, `only ${said.length} states were read`)
})

test('the width of a state column is made from the words it can say', async () => {
  const table = await readFile(path.join(ROOT, THE_TABLE), 'utf8')
  const cell = await readFile(
    path.join(ROOT, WHERE_THE_WIDTH_IS_DECLARED),
    'utf8',
  )
  const names = new Set<string>()

  for (const told of table.matchAll(A_COLUMN_WIDTH)) {
    names.add(told[1])
  }

  assert.ok(names.size > 2, `only ${names.size} state columns were read`)
  assert.match(cell, /export function stateColumnFor\(/)

  const chips = await Promise.all(
    (await sourceFiles('components/recordings')).map((file) =>
      readFile(path.join(ROOT, file), 'utf8'),
    ),
  )

  for (const name of names) {
    assert.ok(
      chips.some((chip) =>
        new RegExp(`export const ${name} = stateColumnFor\\(`).test(chip),
      ),
      `${name} is not made from its column's words`,
    )
  }
})

test('a column width follows the size of the words, not a count of pixels', async () => {
  const cell = await readFile(
    path.join(ROOT, WHERE_THE_WIDTH_IS_DECLARED),
    'utf8',
  )
  assert.match(
    cell,
    /return `calc\(\$\{px\}rem \/ \$\{BASE_FONT_PX\}\)`/u,
    'a state column is no longer measured in rem, so it cannot follow the ' +
      'density steps',
  )
  assert.match(
    cell,
    /const BASE_FONT_PX = [\d.]+/u,
    'the size the column is measured against is no longer written down',
  )
})

test('the pill keeps no width of its own, and nothing is asked to fill a column', async () => {
  const pill = await readFile(path.join(ROOT, WHERE_THE_PILL_IS_DRAWN), 'utf8')

  assert.doesNotMatch(pill, /width/, 'the pill still carries a width')
  assert.doesNotMatch(pill, /w-\[[\d.]+em\]/)
  assert.doesNotMatch(pill, /'w-full'/)

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
