import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const WHERE_THE_DIRECTION_IS_DECLARED = 'components/ui/select.tsx'

const READ = ['app', 'components', 'stories']

const NOT_SOURCE = new Set([
  '.git',
  '.next',
  'node_modules',
  'storybook-static',
])

const AN_OPENING = /<SelectContent\b([^>]*)>/g

const THE_DIRECTION = /\b(side|position|avoidCollisions)\b/

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

async function everySource(): Promise<{ file: string; source: string }[]> {
  const read: { file: string; source: string }[] = []

  for (const dir of READ) {
    for (const file of await sourceFiles(dir)) {
      read.push({ file, source: await readFile(path.join(ROOT, file), 'utf8') })
    }
  }

  return read
}

test('every select asks the shared one which way to open', async () => {
  const asking: string[] = []

  for (const { file, source } of await everySource()) {
    const openings = [...source.matchAll(AN_OPENING)]

    if (openings.length === 0) {
      continue
    }

    asking.push(file)

    if (file !== WHERE_THE_DIRECTION_IS_DECLARED) {
      assert.match(source, /from '@\/components\/ui\/select'/)
    }

    for (const opening of openings) {
      assert.doesNotMatch(
        opening[1],
        THE_DIRECTION,
        `${file} says which way to open: ${opening[0]}`,
      )
    }
  }

  assert.ok(asking.length > 5, `only ${asking.length} files open a select`)
})

test('nothing reaches past the shared select to the primitive', async () => {
  const reaching: string[] = []

  for (const { file, source } of await everySource()) {
    if (/Select as SelectPrimitive/.test(source)) {
      reaching.push(file)
    }
  }

  assert.deepEqual(reaching, [WHERE_THE_DIRECTION_IS_DECLARED])
})

test('the shared select opens downwards and never turns round', async () => {
  const source = await readFile(
    path.join(ROOT, WHERE_THE_DIRECTION_IS_DECLARED),
    'utf8',
  )

  assert.match(source, /position="popper"/)
  assert.match(source, /side="bottom"/)
  assert.match(source, /avoidCollisions=\{false\}/)
})
