import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const THE_LIBRARY = ['components/library', 'app/(app)/library']

const ANOTHER_SCREEN = new Set(['integrity'])

const WHERE_THE_FILTER_IS_DECLARED = 'repository/recordings.ts'

const WHAT_THE_LIBRARY_IS_ASKED = ['q', 'year', 'genre', 'state', 'ch']

const PUT_AWAY: { what: string; spelt: RegExp; caught: string }[] = [
  {
    what: 'a bar that acts on many recordings at once',
    spelt: /一括|\bbulk/i,
    caught: '<div data-slot="bulk-bar">一括削除</div>',
  },
  {
    what: 'a box to tick on each row',
    spelt:
      /@\/components\/ui\/checkbox|<Checkbox\b|type="checkbox"|role="checkbox"/,
    caught: "import { Checkbox } from '@/components/ui/checkbox'",
  },
  {
    what: 'a meter of the storage left',
    spelt: /保存領域|空き容量|\/api\/storage|<meter\b|<progress\b|role="meter"/,
    caught: '<meter value={0.4} />',
  },
  {
    what: 'an action that encodes several recordings together',
    spelt: /まとめて/,
    caught: '<Button>まとめてエンコード</Button>',
  },
  {
    what: 'a selector of the order the rows come in',
    spelt: /並び替え|並べ替え|並び順|\bsortBy\b|\bonSort\b|[?&]sort=/,
    caught: '<FilterSelect prefix="並び替え" />',
  },
  {
    what: 'a selector of how many rows a page shows',
    spelt:
      /表示件数|件数切替|\bperPage\b|\bpageSize\b|usePerPageLocalStorage|ページ送り/,
    caught: 'const [perPage] = usePerPageLocalStorage()',
  },
]

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
      if (!ANOTHER_SCREEN.has(entry.name)) {
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

test('each thing the library put away is caught where it is written', () => {
  for (const one of PUT_AWAY) {
    assert.match(one.caught, one.spelt, `${one.what} would slip past`)
  }
})

test('the library draws none of what it put away', async () => {
  const files: string[] = []

  for (const dir of THE_LIBRARY) {
    files.push(...(await sourceFiles(dir)))
  }

  assert.ok(
    files.includes('components/library/library-page.tsx') &&
      files.includes('app/(app)/library/page.tsx'),
    `the walk found ${files.join(', ')}, so it is not reading the library`,
  )

  const back: string[] = []

  for (const file of files) {
    const source = await readFile(path.join(ROOT, file), 'utf8')

    for (const one of PUT_AWAY) {
      if (one.spelt.test(source)) {
        back.push(`${file}: ${one.what}`)
      }
    }
  }

  assert.deepEqual(
    back,
    [],
    'The library grew back something it deliberately does without. There is ' +
      'no bulk action bar and no row checkbox, no storage meter, no action ' +
      'that encodes several recordings together, and no order or page-size ' +
      'selector: one recording is acted on from its own row, and every row ' +
      'is listed.',
  )
})

test('what the library is asked for carries no order and no page size', async () => {
  const source = await readFile(
    path.join(ROOT, WHERE_THE_FILTER_IS_DECLARED),
    'utf8',
  )
  const declared = source.match(/export interface RecordingsFilter \{([^}]*)\}/)

  assert.ok(
    declared,
    `${WHERE_THE_FILTER_IS_DECLARED} no longer declares RecordingsFilter`,
  )

  const keys = [...declared[1].matchAll(/^\s*(\w+)\??:/gm)].map((one) => one[1])

  assert.deepEqual(
    keys,
    WHAT_THE_LIBRARY_IS_ASKED,
    'The library filter gained a key. Filters narrow what is listed; the ' +
      'order and the number of rows are not for the reader to choose here.',
  )
})
