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

test('a row of actions keeps the one gap it is given', async () => {
  const rows: string[] = []

  for (const { file, source } of await everySource()) {
    for (const row of source.matchAll(/<ActionRow\b([^>]*)>/g)) {
      rows.push(file)
      assert.doesNotMatch(
        row[1],
        /(^|[\s"'])gap-/,
        `${file} spaces its actions its own way: ${row[0]}`,
      )
    }
  }

  assert.ok(rows.length > 6, `only ${rows.length} rows of actions were read`)
})

function keysOf(source: string, group: string): string[] {
  const block = source.match(
    new RegExp(`\\b${group}: \\{([\\s\\S]*?)\\n      \\},`),
  )

  assert.ok(block, `no ${group} block was read`)

  return [...block[1].matchAll(/^\s{8}'?([\w-]+)'?:/gm)].map((key) => key[1])
}

function usesOf(
  sources: { file: string; source: string }[],
  tag: RegExp,
  prop: string,
): Map<string, string[]> {
  const uses = new Map<string, string[]>()

  for (const { file, source } of sources) {
    for (const opening of source.matchAll(tag)) {
      for (const value of opening[1].matchAll(
        new RegExp(`\\b${prop}="([^"]+)"|\\b${prop}: '([^']+)'`, 'g'),
      )) {
        const said = value[1] ?? value[2]

        uses.set(said, [...(uses.get(said) ?? []), file])
      }
    }
  }

  return uses
}

const A_BUTTON_OPENING =
  /<(?:Button|AlertDialogAction|AlertDialogCancel)\b((?:=>|[^>])*)>|buttonVariants\(\{([^}]*)\}\)/g

const AN_ICON_BUTTON_OPENING =
  /<IconButton\b((?:=>|[^>])*)>|iconButtonVariants\(\{([^}]*)\}\)/g

function openingsOf(tag: RegExp, source: string): string[] {
  return [...source.matchAll(tag)].map((found) => found[1] ?? found[2])
}

test('every kind and size a button offers is one the screens use more than once', async () => {
  const sources = await everySource()

  for (const [part, file, tag, groups] of [
    [
      'Button',
      'components/ui/button.tsx',
      A_BUTTON_OPENING,
      ['variant', 'size'],
    ],
    [
      'IconButton',
      'components/vela/icon-button.tsx',
      AN_ICON_BUTTON_OPENING,
      ['variant', 'size'],
    ],
  ] as const) {
    const declared = await read(file)
    const opened = sources.map(({ file: at, source }) => ({
      file: at,
      source: openingsOf(tag, source).join('\n'),
    }))

    for (const group of groups) {
      const uses = usesOf(opened, /^([\s\S]*)$/g, group)

      for (const key of keysOf(declared, group)) {
        if (key === 'default' || (part === 'IconButton' && key === 'pop')) {
          continue
        }

        assert.ok(
          (uses.get(key) ?? []).length > 1,
          `${part} offers ${group} "${key}", which ` +
            `${(uses.get(key) ?? []).length === 0 ? 'no screen uses' : `only ${uses.get(key)} uses`}`,
        )
      }
    }
  }
})

test('nothing but a button is handed a button’s kind', async () => {
  for (const { file, source } of await everySource()) {
    for (const found of source.matchAll(/<(Add[A-Z]\w*)\b[^>]*\bvariant="/g)) {
      assert.fail(
        `${file} hands ${found[1]} a variant of a size; a size is said as size`,
      )
    }
  }
})

const A_WHOLE_BUTTON = /<Button\b((?:=>|[^>])*)>([\s\S]*?)<\/Button>/g

function wordsOf(body: string): string {
  return body
    .replace(/\{[^{}]*\}/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, '')
}

const SAVES = /^(保存|保存する|この内容で保存)$/

test('saving is one button of one height, and the row it sits in is that height', async () => {
  const saving: string[] = []

  for (const { file, source } of await everySource()) {
    for (const button of source.matchAll(A_WHOLE_BUTTON)) {
      if (!SAVES.test(wordsOf(button[2]))) {
        continue
      }

      saving.push(file)
      assert.doesNotMatch(
        button[1],
        /\bsize=/,
        `${file} draws saving at a height of its own`,
      )

      const before = source.slice(0, button.index)
      const rowStarts = Math.max(
        before.lastIndexOf('<div'),
        before.lastIndexOf('<DialogFooter'),
        before.lastIndexOf('<>'),
      )

      assert.doesNotMatch(
        source.slice(rowStarts, button.index),
        /size="sm"/,
        `${file} sets a smaller button beside saving, so the row has two heights`,
      )
    }
  }

  assert.ok(saving.length > 5, `only ${saving.length} saving buttons were read`)

  const tuners = await read('components/tuners/tuners-page.tsx')
  const cancel = tuners.match(/function CancelDetection\(\)[\s\S]*?\n\}/)

  assert.ok(cancel, 'the tuner detection no longer names its cancel')
  assert.doesNotMatch(
    cancel[0],
    /size="sm"/,
    'the cancel beside saving the detected tuners is smaller than saving',
  )
})
