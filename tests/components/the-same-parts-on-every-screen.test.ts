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

const A_NAMED_ACTION = /<[A-Z][A-Za-z]*Button\b/g

const A_METRIC_TILE = /data-slot="metric-tile"/

const NOT_A_STATE = /<Badge\b[^>]*variant="kind[A-Z]/g

const AN_ICON = /<[A-Z][A-Za-z]*(Icon|Glyph)\b|<Spinner\b/

const DELETES = /<TrashIcon\b/

const ADDS = /追加/

const SAYS_IT_AS_A_COLUMN = /(^|\s)say(\s|$|=)/

const THE_CELL = 'components/recordings/status-cell.tsx'

const THE_PILL = 'components/ui/badge.tsx'

const THE_ROW = 'components/vela/action-row.tsx'

const THE_EMPTY_VALUE = 'lib/empty-value.ts'

const THE_TINTS = 'components/vela/surface.tsx'

const THE_BAND = 'components/vela/filter-select.tsx'

const THE_SYSTEM_TERMS = 'lib/system-terms.ts'

const THE_RECORDING_EXCEPTION = 'RecordingInProgressChip'

const WATCHED_FOR_THE_MARK = ['components/encode', 'components/system']

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

function saidBy(body: string): string {
  return body.replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '')
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
        'through StatusCell, so its states sit however they like',
    )
  }
})

test('a state in a table is a dot and a word, with no outline and no fill', async () => {
  const said: string[] = []

  for (const column of await stateColumns()) {
    for (const pill of column.body.matchAll(A_PILL)) {
      if (pill[1] === THE_RECORDING_EXCEPTION) {
        continue
      }

      said.push(`${column.file}: ${pill[1]}`)
      assert.match(
        pill[2],
        SAYS_IT_AS_A_COLUMN,
        `${column.file}: ${pill[1]} still wears a pill inside a table. The ` +
          'canon keeps the pill for the places outside a list — a detail ' +
          'heading, a tile, a filter chip — and a table says its state as a ' +
          '6px dot and a word',
      )
    }
  }

  assert.ok(said.length > 5, `only ${said.length} states were read`)
})

test('what is not a state is not drawn as a pill', async () => {
  for (const { file, source } of await everySource()) {
    for (const found of source.matchAll(NOT_A_STATE)) {
      assert.fail(
        `${file} draws ${found[0]} as a pill; it is a kind, not a state`,
      )
    }
  }

  assert.doesNotMatch(
    await readFile(path.join(ROOT, 'components/ui/badge.tsx'), 'utf8'),
    /kind[A-Z]/,
    'the pill still keeps a colour for a kind',
  )
})

test('the dot a state is said with is one size, declared once', async () => {
  const cell = await readFile(path.join(ROOT, THE_CELL), 'utf8')

  assert.match(cell, /export function StateSay\(/)
  assert.match(
    cell,
    /size-1\.5 shrink-0 rounded-full bg-current/,
    'the dot beside a state word is no longer the one 6px dot',
  )
  assert.doesNotMatch(
    cell,
    /border|bg-(?!current)/,
    'the way a table says a state carries an outline or a fill again',
  )
})

test('a state cell holds one state and nothing under it', async () => {
  const cell = await readFile(path.join(ROOT, THE_CELL), 'utf8')

  assert.doesNotMatch(
    cell,
    /\bnote\b/,
    'the one state cell still draws a second line under the state',
  )
  assert.doesNotMatch(cell, /flex-col/, 'the one state cell still stacks')

  for (const column of await stateColumns()) {
    const pills = [...column.body.matchAll(A_PILL)]

    assert.equal(
      pills.length,
      1,
      `${column.file} puts ${pills.length} states in one cell; ` +
        'the rest belongs in the tip',
    )
  }
})

test('a width is measured for the two-word pill and for nothing else', async () => {
  const pill = await readFile(path.join(ROOT, THE_PILL), 'utf8')

  assert.doesNotMatch(pill, /width/)
  assert.doesNotMatch(pill, /w-\[[\d.]+em\]/)
  assert.doesNotMatch(pill, /'w-full'/)

  const measuring: string[] = []

  for (const { file, source } of await everySource()) {
    assert.doesNotMatch(
      source,
      /_PILL_WIDTH|stateColumnPx/,
      `${file} still measures a column by the pill that used to sit in it`,
    )

    if (/pillWidthFor/.test(source)) {
      measuring.push(file)
    }
  }

  assert.deepEqual(
    measuring,
    [THE_CELL],
    'a pill is measured somewhere other than the one cell that draws the ' +
      'two words of a yes-or-no column; every column with four words or ' +
      'more says its state as a dot and a word, which has no width of its own',
  )

  const cell = await readFile(path.join(ROOT, THE_CELL), 'utf8')

  assert.match(
    cell,
    /export const ABLE: readonly string\[\] = \['有効', '無効'\]/,
    'the two words the pill is measured for are no longer written down',
  )
  assert.match(cell, /pillWidthFor\(ABLE\)/)
})

function actionsIn(body: string): number {
  return (
    [...body.matchAll(A_BUTTON)].length +
    [...body.matchAll(A_NAMED_ACTION)].length
  )
}

test('a cell that holds more than one action goes through the one row', async () => {
  const groups: string[] = []

  for (const { file, source } of await everySource()) {
    for (const cell of cellsIn(source)) {
      if (actionsIn(cell.body) < 2) {
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
        /variant="remove/,
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

test('an action named after what it does carries an icon beside its word', async () => {
  const drawn: string[] = []

  for (const file of [
    'components/encode/change-definition-button.tsx',
    'components/encode/remove-definition-button.tsx',
  ]) {
    const source = await readFile(path.join(ROOT, file), 'utf8')

    for (const button of source.matchAll(A_BUTTON)) {
      drawn.push(`${file}: ${saidBy(button[2]).trim()}`)
      assert.match(
        button[2],
        AN_ICON,
        `${file} offers an action with no icon on it: ` +
          saidBy(button[2]).trim(),
      )
    }
  }

  assert.ok(drawn.length > 1, `only ${drawn.length} actions were read`)
})

test('the mark that stands for an empty value is written down once', async () => {
  const said = await readFile(path.join(ROOT, THE_EMPTY_VALUE), 'utf8')
  const named = said.match(/export const \w+ = '(.+)'/u)

  assert.ok(named, 'the mark that stands for an empty value has no name')

  const mark = named[1]

  assert.match(mark, /^[—–]$/u, 'the mark is not a dash')

  for (const dir of WATCHED_FOR_THE_MARK) {
    for (const file of await sourceFiles(dir)) {
      const source = await readFile(path.join(ROOT, file), 'utf8')

      assert.doesNotMatch(
        source,
        /[—–]/u,
        `${file} writes a dash of its own where the one mark belongs`,
      )
    }
  }
})

test('what a metric tile is drawn on is one colour face, named once', async () => {
  const drawn = (await everySource()).filter(({ source }) =>
    A_METRIC_TILE.test(source),
  )

  assert.ok(drawn.length >= 1, `only ${drawn.length} files draw a metric tile`)

  for (const { file, source } of drawn) {
    assert.match(
      source,
      /TINT_CLASS/,
      `${file} draws its metric tiles on a face of its own instead of the ` +
        'tint the canon puts them on',
    )
  }

  const tints = await readFile(path.join(ROOT, THE_TINTS), 'utf8')

  assert.match(tints, /export const TINT_CLASS/)
})

test('the controls in a filter band are one height and one size of word', async () => {
  const band = await readFile(path.join(ROOT, THE_BAND), 'utf8')

  assert.match(band, /export const BAND_CONTROL = '[^']+'/)

  for (const file of [
    'components/library/library-page.tsx',
    'components/library/channel-chip.tsx',
  ]) {
    const source = await readFile(path.join(ROOT, file), 'utf8')

    assert.match(
      source,
      /BAND_CONTROL/,
      `${file} gives a control in the band a height of its own`,
    )
  }
})

test('every state in the encode column is said the same way', async () => {
  const source = await readFile(
    path.join(ROOT, 'components/recordings/encode-chip.tsx'),
    'utf8',
  )

  const pills = [...source.matchAll(/<Badge\b([^>]*)>/g)]
  const words = [...source.matchAll(/<StateSay\b([^>]*)>/g)]

  assert.equal(
    pills.length,
    1,
    'the encode column draws more than one shape of pill; the meaning is ' +
      'meant to be carried by the hue alone',
  )
  assert.equal(
    words.length,
    1,
    'the encode column says its state in more than one shape of word',
  )
  assert.match(pills[0][1], /variant=\{/)
  assert.match(words[0][1], /tone=\{/)
})

test('the system screen says a state as a noun, from the one table', async () => {
  const source = await readFile(
    path.join(ROOT, 'components/system/system-page.tsx'),
    'utf8',
  )

  for (const head of source.matchAll(/head="([^"]+)"/g)) {
    assert.fail(
      `the system screen says a state of its own: ${head[1]}; the words ` +
        'belong in the terms table',
    )
  }

  const terms = await readFile(path.join(ROOT, THE_SYSTEM_TERMS), 'utf8')
  const table = terms.match(
    /export const SYSTEM_STATE_LABELS = \{([\s\S]*?)\} as const/u,
  )

  assert.ok(table, 'the system states have no table')

  for (const word of table[1].matchAll(/: '([^']+)'/gu)) {
    assert.doesNotMatch(
      word[1],
      /(ます|ません|でした|られ)/u,
      `the system states are meant to be nouns, but one is a sentence: ${word[1]}`,
    )
  }
})

test('a table surface stops at its last row instead of filling the screen', async () => {
  for (const file of [
    'components/library/recordings-table.tsx',
    'components/reservations/reservations-page.tsx',
    'components/reservations/outcomes-page.tsx',
    'components/integrity/integrity-page.tsx',
  ]) {
    const source = await readFile(path.join(ROOT, file), 'utf8')

    assert.doesNotMatch(
      source,
      /min-h-0 flex-1 overflow/,
      `${file} stretches its table to the bottom of the screen and leaves an empty surface under the rows`,
    )
    assert.match(source, /min-h-0 flex-initial overflow/)
  }
})
