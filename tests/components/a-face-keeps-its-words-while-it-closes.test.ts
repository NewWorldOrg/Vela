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

async function sources(dir: string): Promise<string[]> {
  const found: string[] = []

  for (const entry of await readdir(path.join(ROOT, dir), {
    withFileTypes: true,
  })) {
    const relative = path.posix.join(dir, entry.name)

    if (entry.isDirectory()) {
      found.push(...(await sources(relative)))
    } else if (entry.name.endsWith('.tsx')) {
      found.push(relative)
    }
  }

  return found
}

test('a face opened on a thing that may be null draws what it held while it closes', async () => {
  const offenders: string[] = []

  let read = 0

  for (const file of await sources('components')) {
    const source = await readFile(path.join(ROOT, file), 'utf8')

    for (const found of source.matchAll(
      /open=\{\s*(\w+)\s*(?:!==?|!=)\s*(?:null|undefined)\s*\}|open=\{\s*(?:Boolean\((\w+)\)|!!(\w+))\s*\}/g,
    )) {
      const opened = found[1] ?? found[2] ?? found[3]

      read += 1

      if (!new RegExp(`useHeldWhileClosing\\(\\s*${opened}\\b`).test(source)) {
        offenders.push(`${file}: ${found[0]}`)
      }
    }
  }

  assert.ok(
    read >= 3,
    `only ${read} faces opened on a nullable thing were read`,
  )
  assert.deepEqual(offenders, [])
})
