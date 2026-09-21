import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

import { EMPTY_VALUE } from '@/lib/empty-value'
import { BROADCAST_KIND_LABEL } from '@/lib/broadcast-terms'

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

const THE_EMPTY_VALUE = 'lib/empty-value.ts'

const THE_KINDS = 'lib/broadcast-terms.ts'

const THE_WAITING = 'components/vela/waiting.tsx'

const SCREENS_READ_EVERY_DAY = [
  'app/(app)/library',
  'app/(app)/guide',
  'app/(app)/reservations',
  'app/(app)/live',
]

const A_VALUE_A_READER_READS =
  /(?<![=$])\{\s*([A-Za-z_$][\w$]*(?:[.?]+[\w$]+)+)\s*\}/g

const AN_IDENTIFIER = /[Ii][Dd]$/

const THE_DRIVER_INSTANCE = /\binstanceId\b/

const AN_EMPTY_BRANCH =
  /\.length\s*===\s*0\s*(?:\?|&&)\s*\(\s*<([a-z][\w-]*)\b[^>]*>([\s\S]*?)<\/\1>/g

const EVERY_EMPTY_BRANCH = /\.length\s*===\s*0\s*(?:\?|&&)/g

const A_PART = /<[A-Z]/

const AN_EMPTY_STATE_TITLE = /<EmptyState\b[\s\S]{0,320}?title="([^"]*)"/g

const A_DASH = /(?:'|>)([-‐-―−])(?:'|<)/g

const SAYS_IT_IN_ENGLISH = /Loading/

const A_TOASTER = /<Toaster\b/

const A_HALF_SPELT_KIND = /地上(?!波)/

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

    if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      found.push(relative)
    }
  }

  return found
}

async function everySource(
  dirs: string[] = READ,
): Promise<{ file: string; source: string }[]> {
  const read: { file: string; source: string }[] = []

  for (const dir of dirs) {
    for (const file of await sourceFiles(dir)) {
      read.push({ file, source: await readFile(path.join(ROOT, file), 'utf8') })
    }
  }

  return read
}

async function exists(relative: string): Promise<boolean> {
  try {
    await stat(path.join(ROOT, relative))

    return true
  } catch {
    return false
  }
}

test('no screen puts an identifier where a reader reads a value', async () => {
  const read: string[] = []

  for (const { file, source } of await everySource()) {
    if (!file.endsWith('.tsx')) {
      continue
    }

    for (const said of source.matchAll(A_VALUE_A_READER_READS)) {
      read.push(said[1])
      assert.doesNotMatch(
        said[1],
        AN_IDENTIFIER,
        `${file} draws ${said[1]} as a value on the screen. An instance, a ` +
          'sid or a row id is how this application talks to itself, not an ' +
          'answer to what the reader asked',
      )
    }
  }

  assert.ok(read.length > 100, `only ${read.length} values were read`)
})

test('the identifier the driver names itself by stays out of the screens', async () => {
  for (const { file, source } of await everySource()) {
    if (!file.endsWith('.tsx')) {
      continue
    }

    assert.doesNotMatch(
      source,
      THE_DRIVER_INSTANCE,
      `${file} carries the driver instance into the view layer, and what ` +
        'reaches the view layer sooner or later reaches the screen',
    )
  }
})

test('a list with nothing in it says so through the one part', async () => {
  let branches = 0

  for (const { file, source } of await everySource()) {
    branches += [...source.matchAll(EVERY_EMPTY_BRANCH)].length

    for (const branch of source.matchAll(AN_EMPTY_BRANCH)) {
      assert.match(
        branch[2],
        A_PART,
        `${file} writes out its own empty list in a <${branch[1]}>, so its ` +
          'wording, its spacing and its ending are this file’s own',
      )
    }
  }

  assert.ok(branches > 8, `only ${branches} empty branches were read`)
})

test('every empty list ends its sentence the same way', async () => {
  const titles: string[] = []

  for (const { file, source } of await everySource()) {
    for (const said of source.matchAll(AN_EMPTY_STATE_TITLE)) {
      titles.push(said[1])
      assert.ok(
        !said[1].endsWith('。'),
        `${file}: “${said[1]}” ends with a full stop while the rest do not`,
      )
    }
  }

  assert.ok(titles.length > 10, `only ${titles.length} titles were read`)
})

test('the sign for a value that is not there is named once', async () => {
  assert.ok(
    await exists(THE_EMPTY_VALUE),
    'the sign for an empty value has no one place to be named',
  )

  const dashes = new Set<string>()

  for (const { file, source } of await everySource()) {
    for (const dash of source.matchAll(A_DASH)) {
      dashes.add(dash[1])
      assert.equal(
        dash[1],
        EMPTY_VALUE,
        `${file} writes an empty value with a dash of its own`,
      )
    }
  }

  assert.ok(dashes.size <= 1, `${dashes.size} kinds of dash were read`)
})

test('the screens read every day say they are waiting, in the one shape', async () => {
  for (const screen of SCREENS_READ_EVERY_DAY) {
    assert.ok(
      await exists(`${screen}/loading.tsx`),
      `${screen} shows nothing at all while it waits`,
    )

    assert.match(
      await readFile(path.join(ROOT, `${screen}/loading.tsx`), 'utf8'),
      /@\/components\/vela\/waiting/,
      `${screen} draws a waiting shape of its own`,
    )
  }

  assert.match(
    await readFile(path.join(ROOT, THE_WAITING), 'utf8'),
    /@\/components\/ui\/skeleton/,
    'the one waiting shape is not built out of the one skeleton',
  )
})

test('nothing on a screen is still waiting in English', async () => {
  for (const { file, source } of await everySource()) {
    assert.doesNotMatch(
      source,
      SAYS_IT_IN_ENGLISH,
      `${file} still says it is waiting in a language the screens do not use`,
    )
  }
})

test('a way of speaking that is never used is not wired up', async () => {
  for (const { file, source } of await everySource()) {
    assert.doesNotMatch(
      source,
      A_TOASTER,
      `${file} mounts a toaster, and nothing in this application raises one`,
    )
  }
})

test('the kinds of broadcast are spelt from the one table', async () => {
  assert.equal(BROADCAST_KIND_LABEL.terrestrial, '地上波')

  for (const { file, source } of await everySource([
    ...READ,
    'lib',
    'repository',
  ])) {
    if (file === THE_KINDS || file.includes('client/schema')) {
      continue
    }

    assert.doesNotMatch(
      source,
      A_HALF_SPELT_KIND,
      `${file} spells the kind of broadcast its own way instead of taking ` +
        `it from ${THE_KINDS}`,
    )
  }
})
