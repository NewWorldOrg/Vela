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
