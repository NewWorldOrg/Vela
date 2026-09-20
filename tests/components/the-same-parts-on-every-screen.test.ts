import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

const READ = ['app', 'components']

const NOT_SOURCE = new Set([
  '.git',
  '.next',
  'node_modules',
  'storybook-static',
])

const A_CELL = /<(TableCell|td)\b([^>]*)>([\s\S]*?)<\/\1>/g

const A_PILL = /<([A-Z][A-Za-z]*Chip|Badge)\b([^>]*?)\/?>/g

const CARRIES_A_PILL = /<([A-Z][A-Za-z]*Chip|Badge)\b/

const SAYS_SOMETHING_ELSE =
  /<(Link|p|a|b|small|em|strong|code|Button|Checkbox|Switch)\b/

const A_BUTTON = /<Button\b([^>]*)>([\s\S]*?)<\/Button>/g

const AN_ICON = /<[A-Z][A-Za-z]*(Icon|Glyph)\b|<Spinner\b/

const DELETES = /<TrashIcon\b/

const ADDS = /追加/

const THE_COLUMN_WIDE = 'COLUMN_WIDE'

const THE_CELL = 'components/recordings/status-cell.tsx'

const THE_ROW = 'components/vela/action-row.tsx'

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

    if (entry.name.endsWith('.tsx')) {
      found.push(relative)
    }
  }

  return found
}

async function everySource(): Promise<{ file: string; source: string }[]> {
  const read: { file: string; source: string }[] = []

  for (const dir of READ) {
    for (const file of await sourceFiles(dir)) {
      read.push({ file, source: await readFile(path.join(ROOT, file), 'utf8') })
    }
  }

  return read
}

function cellsIn(source: string) {
  return [...source.matchAll(A_CELL)].map((cell) => ({
    declared: cell[2],
    body: cell[3],
  }))
}

async function stateColumns() {
  const found: { file: string; body: string }[] = []

  for (const { file, source } of await everySource()) {
    for (const cell of cellsIn(source)) {
      if (
        CARRIES_A_PILL.test(cell.body) &&
        !SAYS_SOMETHING_ELSE.test(cell.body)
      ) {
        found.push({ file, body: cell.body })
      }
    }
  }

  return found
}

function saidBy(body: string): string {
  return body.replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '')
}

test('a column that says a state goes through the one cell', async () => {
  const columns = await stateColumns()

  assert.ok(
    columns.length > 6,
    `only ${columns.length} state columns were read; the scan is watching ` +
      'almost nothing',
  )

  for (const column of columns) {
    assert.match(
      column.body,
      /<StatusCell\b/,
      `${column.file} draws a state column of its own instead of going ` +
        'through StatusCell, so its pills sit at whatever width they like',
    )
  }
})

test('every pill in a state column is told to fill it, by the one name', async () => {
  const told: string[] = []

  for (const column of await stateColumns()) {
    for (const pill of column.body.matchAll(A_PILL)) {
      told.push(`${column.file}: ${pill[1]}`)
      assert.match(
        pill[2],
        new RegExp(`width=\\{${THE_COLUMN_WIDE}\\}`),
        `${column.file}: ${pill[1]} draws itself as wide as it likes`,
      )
    }
  }

  assert.ok(told.length > 8, `only ${told.length} pills were read`)
})

test('what the one name means is the pill filling the column', async () => {
  const cell = await readFile(path.join(ROOT, THE_CELL), 'utf8')
  const named = cell.match(
    new RegExp(`export const ${THE_COLUMN_WIDE}: BadgeWidth = '(\\w+)'`),
  )

  assert.ok(named, 'the column width the pills are told to take has no name')
  assert.match(
    await readFile(path.join(ROOT, 'components/ui/badge.tsx'), 'utf8'),
    new RegExp(`${named[1]}: 'w-full'`),
  )
})

test('a cell that holds more than one action goes through the one row', async () => {
  const groups: string[] = []

  for (const { file, source } of await everySource()) {
    for (const cell of cellsIn(source)) {
      if ([...cell.body.matchAll(A_BUTTON)].length < 2) {
        continue
      }

      groups.push(file)
      assert.match(
        cell.body,
        /<ActionRow\b/,
        `${file} lays out a group of actions itself, so their widths and ` +
          'the gaps between them are this file’s own',
      )
    }
  }

  assert.ok(groups.length > 1, `only ${groups.length} groups were read`)
})

test('how wide the actions in a group are is declared in one file', async () => {
  const row = await readFile(path.join(ROOT, THE_ROW), 'utf8')

  assert.match(row, /auto-cols-fr/)

  for (const { file, source } of await everySource()) {
    if (file === THE_ROW) {
      continue
    }

    assert.doesNotMatch(source, /auto-cols-fr/, `${file} evens out its own row`)
  }
})

test('deleting is destructive, with an icon and a word, wherever it is offered', async () => {
  const deleting: string[] = []

  for (const { file, source } of await everySource()) {
    for (const button of source.matchAll(A_BUTTON)) {
      if (!DELETES.test(button[2])) {
        continue
      }

      deleting.push(file)
      assert.match(
        button[1],
        /variant="destructive/,
        `${file} offers deleting without saying so by its colour`,
      )
      assert.doesNotMatch(
        button[1],
        /size="icon/,
        `${file} offers deleting as a bare icon, with no word beside it`,
      )
      assert.notEqual(
        saidBy(button[2]).trim(),
        '',
        `${file} offers deleting with an icon and no word`,
      )
    }
  }

  assert.ok(deleting.length > 5, `only ${deleting.length} were read`)
})

test('an action carries an icon beside its word', async () => {
  const drawn: string[] = []

  for (const file of [
    'components/library/recording-row.tsx',
    'components/recordings/recording-actions.tsx',
    'components/reservations/reservation-row.tsx',
    'components/channels/candidate-list.tsx',
    'components/integrity/integrity-page.tsx',
    'components/guide/program-panel.tsx',
  ]) {
    const source = await readFile(path.join(ROOT, file), 'utf8')
    const rows = source.matchAll(/<ActionRow\b[^>]*>([\s\S]*?)<\/ActionRow>/g)

    for (const row of rows) {
      for (const button of row[1].matchAll(A_BUTTON)) {
        drawn.push(`${file}: ${saidBy(button[2]).trim()}`)
        assert.match(
          button[2],
          AN_ICON,
          `${file} puts a word in a group of actions with no icon on it: ` +
            saidBy(button[2]).trim(),
        )
      }
    }
  }

  assert.ok(drawn.length > 8, `only ${drawn.length} actions were read`)
})

test('making a new one is the filled button, wherever it is offered', async () => {
  const adding: string[] = []

  for (const { file, source } of await everySource()) {
    for (const button of source.matchAll(A_BUTTON)) {
      if (!ADDS.test(saidBy(button[2]))) {
        continue
      }

      adding.push(`${file}: ${saidBy(button[2]).trim()}`)
      assert.doesNotMatch(
        button[1],
        /variant="/,
        `${file} offers making a new one in something other than the ` +
          'filled button: ' +
          saidBy(button[2]).trim(),
      )
    }
  }

  assert.ok(adding.length > 4, `only ${adding.length} were read`)
})

test('the record on a recording says its state values in pills', async () => {
  const source = await readFile(
    path.join(ROOT, 'components/recordings/recording-record.tsx'),
    'utf8',
  )

  for (const [label, pill] of [
    ['結果', 'OutcomeChip'],
    ['エンコード', 'EncodeChip'],
    ['サムネイル', 'ThumbnailChip'],
  ]) {
    assert.match(
      source,
      new RegExp(`label="${label}"[\\s\\S]{0,120}main=\\{<${pill}\\b`, 'u'),
      `the record says ${label} in bare text while the list beside it says ` +
        'the same value in a pill',
    )
  }
})
