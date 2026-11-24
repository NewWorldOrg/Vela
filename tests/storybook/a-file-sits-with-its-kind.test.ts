import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

const NAMED_BY_NEXT = new Set([
  'route.ts',
  'manifest.ts',
  'sitemap.ts',
  'robots.ts',
  'icon.ts',
  'apple-icon.ts',
  'opengraph-image.ts',
  'twitter-image.ts',
])

const SERVER_ACTIONS = 'actions.ts'

async function filesUnder(dir: string): Promise<string[]> {
  const found: string[] = []

  for (const entry of await readdir(path.join(ROOT, dir), {
    withFileTypes: true,
  })) {
    const relative = path.posix.join(dir, entry.name)

    if (entry.isDirectory()) {
      found.push(...(await filesUnder(relative)))
    } else {
      found.push(relative)
    }
  }

  return found
}

test('components/ holds components, each in a .tsx file, and nothing else', async () => {
  const files = await filesUnder('components')

  assert.ok(files.length > 100, `only ${files.length} files were walked`)
  assert.deepEqual(
    files.filter((file) => !file.endsWith('.tsx')),
    [],
    'A file under components/ is not a component. Code without React goes to ' +
      'lib/, and a hook to hooks/.',
  )
})

test('app/ holds no .ts but the server actions and the files Next.js reads by name', async () => {
  const files = await filesUnder('app')

  assert.ok(files.length > 30, `only ${files.length} files were walked`)
  assert.deepEqual(
    files
      .filter((file) => /\.[cm]?ts$/.test(file))
      .filter((file) => {
        const name = path.posix.basename(file)

        return name !== SERVER_ACTIONS && !NAMED_BY_NEXT.has(name)
      }),
    [],
    'A .ts file under app/ is neither server actions nor a file Next.js ' +
      'reads by name. It goes to lib/, hooks/ or repository/.',
  )
})
