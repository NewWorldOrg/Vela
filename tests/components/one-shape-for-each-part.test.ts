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

const NOT_SOURCE = new Set([
  '.git',
  '.next',
  'node_modules',
  'storybook-static',
])

async function sourceFiles(dir: string, ending = /\.tsx$/): Promise<string[]> {
  const found: string[] = []

  for (const entry of await readdir(path.join(ROOT, dir), {
    withFileTypes: true,
  })) {
    const relative = path.posix.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!NOT_SOURCE.has(entry.name)) {
        found.push(...(await sourceFiles(relative, ending)))
      }
      continue
    }

    if (ending.test(entry.name)) {
      found.push(relative)
    }
  }

  return found
}

async function read(file: string): Promise<string> {
  return readFile(path.join(ROOT, file), 'utf8')
}

function classOf(source: string, name: string): string {
  const declared = source.match(
    new RegExp(`function ${name}\\b[\\s\\S]*?className=\\{cn\\(\\s*'([^']+)'`),
  )

  assert.ok(declared, `the shared ${name} no longer declares its classes`)

  return declared[1]
}

function paddingOf(classes: string): string {
  const found = classes.match(/(?:^|\s)(px-\S+)/)

  assert.ok(found, `no side padding in: ${classes}`)

  return found[1]
}

test('the library and search tables head their columns with the shared heading cell', async () => {
  const table = await read('components/ui/table.tsx')
  const cellPadding = paddingOf(classOf(table, 'TableCell'))

  assert.equal(cellPadding, paddingOf(classOf(table, 'TableHead')))

  for (const file of [
    'components/library/recordings-table.tsx',
    'components/search/search-page.tsx',
  ]) {
    const source = await read(file)

    assert.doesNotMatch(
      source,
      /<th\b/,
      `${file} draws its column headings itself, so their padding and ` +
        'letter spacing are its own',
    )
    assert.match(source, /<TableHead\b/)
  }

  const row = await read('components/library/recording-row.tsx')
  const cell = row.match(/const CELL =\s*'([^']+)'/)

  assert.ok(cell, 'the library row no longer names its cell')
  assert.equal(
    paddingOf(cell[1]),
    cellPadding,
    'the library cells sit at a different inset from their headings',
  )

  const search = await read('components/search/search-page.tsx')
  const cells = [...search.matchAll(/<td className="([^"]+)"/g)]

  assert.ok(cells.length >= 4, `only ${cells.length} search cells were read`)

  for (const found of cells) {
    assert.equal(
      paddingOf(found[1]),
      cellPadding,
      'a search cell sits at a different inset from its heading',
    )
  }
})

async function everySource(
  dirs: string[] = ['app', 'components'],
): Promise<{ file: string; source: string }[]> {
  const found: { file: string; source: string }[] = []

  for (const dir of dirs) {
    for (const file of await sourceFiles(dir)) {
      found.push({ file, source: await read(file) })
    }
  }

  return found
}

const A_CELL = /<(TableCell|td)\b([^>]*)>([\s\S]*?)<\/\1>/g

const SAYS_A_MOMENT =
  /\{[^}]*\b(\w+At|whenLabel|occurredLabel|formatMoment\w*)\b[^}]*\}|<Started\b/

test('a moment in a table sits at the left, the same as its heading', async () => {
  const moments: string[] = []

  for (const { file, source } of await everySource()) {
    for (const cell of source.matchAll(A_CELL)) {
      if (!SAYS_A_MOMENT.test(cell[3])) {
        continue
      }

      moments.push(file)
      assert.doesNotMatch(
        cell[2],
        /text-right/,
        `${file} sets a moment against the right edge of its column, ` +
          'while every other table starts its moments at the left',
      )
    }
  }

  assert.ok(moments.length > 5, `only ${moments.length} moments were read`)
})

test('the integrity table heads each column on the side its values sit', async () => {
  const source = await read('components/integrity/integrity-page.tsx')

  assert.match(source, /label: 'サイズ',[^}]*right: true/)
  assert.doesNotMatch(source, /label: '検出',[^}]*right: true/)
  assert.match(
    source,
    /<TableHead\s+key=\{column\.label\}\s+className=\{column\.right \? 'text-right' : undefined\}/,
    'the integrity headings do not follow the side their column is set to',
  )
})

test('the heading of an actions column is read out and not drawn, in every table', async () => {
  const headed: string[] = []

  for (const { file, source } of await everySource()) {
    for (const found of source.matchAll(
      /<(TableHead|th)\b[^>]*>\s*操作\s*<\/\1>/g,
    )) {
      assert.fail(
        `${file} draws the heading of its actions column: ${found[0]}`,
      )
    }

    for (const found of source.matchAll(/\{[^{}]*label: '操作'[^{}]*\}/g)) {
      headed.push(file)
      assert.match(
        found[0],
        /hidden: true/,
        `${file} draws the heading of its actions column`,
      )
    }
  }

  assert.ok(
    headed.length > 4,
    `only ${headed.length} actions columns were read`,
  )
})
