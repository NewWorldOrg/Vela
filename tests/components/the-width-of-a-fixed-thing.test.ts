import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

const THE_SHELL = 'components/vela/app-shell.tsx'

const THE_LIBRARY_TABLE = 'components/library/recordings-table.tsx'

const THE_LIBRARY_ROW = 'components/library/recording-row.tsx'

const THE_RESERVATION_ROW = 'components/reservations/reservation-row.tsx'

const THE_VOLUME = 'components/recordings/player-volume.tsx'

const THE_RULES = 'components/reservations/rules-page.tsx'

const THE_RULES_REFUSALS = 'repository/rules.ts'

const A_WIDTH_IN_PX = /(^|[\s'"])w-\[\d+(\.\d+)?px\]/

const A_WIDTH = /width: ((?:'|`|calc)[^,\n]+)/g

const A_ROW = /<(tr|TableRow)\b([\s\S]*?)\n {6}>/

const THE_TINTS = /bg-(brand|coral|lemon|mint|sky)-soft/

async function read(file: string): Promise<string> {
  return await readFile(path.join(ROOT, file), 'utf8')
}

test('the column of screens a setting sits beside is measured in letters', async () => {
  const shell = await read(THE_SHELL)
  const nav = shell.slice(
    shell.indexOf('export function AdminSideNav('),
    shell.indexOf('const SCREEN_WIDTHS'),
  )

  assert.doesNotMatch(
    nav,
    A_WIDTH_IN_PX,
    'the side column holds a width in px, which the density steps take past ' +
      'the words it has to hold',
  )
  assert.match(nav, /w-\[11rem\]/)
  assert.match(
    nav,
    /whitespace-nowrap max-\[900px\]:hidden/,
    'a name in the side column may still break across two lines',
  )
})

test('every column of the library table is measured in letters', async () => {
  const table = await read(THE_LIBRARY_TABLE)

  const widths = [...table.matchAll(A_WIDTH)].map((one) => one[1])

  assert.ok(widths.length > 6, `only ${widths.length} widths were read`)

  for (const width of widths) {
    assert.ok(
      /rem|_COLUMN|column\.width/.test(width),
      `a column of the table is ${width}, which keeps its size while the ` +
        'letters in it grow',
    )
  }

  assert.match(table, /minWidth: TABLE_MIN/)
  assert.match(table, /const TABLE_MIN = '\d+(\.\d+)?rem'/)
})

test('the state columns and the actions after them are held apart', async () => {
  const table = await read(THE_LIBRARY_TABLE)
  const row = await read(THE_LIBRARY_ROW)

  assert.equal(
    (table.match(/gap: GAP_BEFORE_STATE/g) ?? []).length,
    3,
    'the three state columns do not all carry the room on their left that ' +
      'the header measured',
  )
  assert.match(table, /gap: GAP_BEFORE_ACTIONS/)
  assert.equal(
    (row.match(/GAP_BEFORE_STATE/g) ?? []).length,
    4,
    'the cells under the state headers do not carry the same room the ' +
      'headers do',
  )
  assert.match(row, /export const GAP_BEFORE_STATE = 'pl-4'/)
  assert.match(row, /export const GAP_BEFORE_ACTIONS = 'pl-5'/)
})

test('no row says its state with a colour laid under the whole of it', async () => {
  for (const file of [THE_LIBRARY_ROW, THE_RESERVATION_ROW]) {
    const row = (await read(file)).match(A_ROW)

    assert.ok(row, `${file} draws no row this test can read`)
    assert.doesNotMatch(
      row[2],
      THE_TINTS,
      `${file} lays a colour under the row; a state is said by the dot and ` +
        'the word in its own column, and the only colour a row carries is ' +
        'the grey it takes under the hand',
    )
    assert.doesNotMatch(
      row[2],
      /(^|:)bg-(?!surface)/,
      `${file} gives the row a background of its own outside the greys`,
    )
  }
})

test('the mark on the volume sits on the line it reads against', async () => {
  const volume = await read(THE_VOLUME)

  assert.match(
    volume,
    /slider-thumb\]:mt-\[calc\(\(2px_-_13rem\/16\)\/2\)\]/,
    'WebKit lays the top of the mark on the top of the track, so the mark ' +
      'is centred on the line only when it is pulled up by half of what it ' +
      'is taller than the track',
  )
  assert.match(volume, /slider-runnable-track\]:h-\[2px\]/)
  assert.match(volume, /range-track\]:h-\[2px\]/)
  assert.match(volume, /slider-thumb\]:size-\[calc\(13rem\/16\)\]/)
  assert.match(volume, /range-thumb\]:size-\[calc\(13rem\/16\)\]/)
  assert.match(volume, /bg-\(--pl-accent\)/)
})

test('a rehearsal is the migration word; a rule looks at its matches', async () => {
  for (const file of [THE_RULES, THE_RULES_REFUSALS]) {
    assert.doesNotMatch(
      await read(file),
      /下見/,
      `${file} still calls looking at what a rule matches a rehearsal, which ` +
        'is the word the migration run owns',
    )
  }

  assert.match(await read(THE_RULES), /一致を見る/)
})
