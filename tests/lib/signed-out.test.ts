import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

import { signedOut } from '@/lib/signed-out'

const THE_ONE_PLACE = 'lib/signed-out.ts'

const WALKED = ['app', 'components', 'hooks', 'lib', 'repository']

const HEAD = 'サインインが切れているため'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
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
      found.push(...(await sourceFiles(relative)))
      continue
    }

    if (/\.tsx?$/.test(entry.name)) {
      found.push(relative)
    }
  }

  return found
}

test('the sentence names what could not be done', () => {
  assert.equal(
    signedOut('予約'),
    'サインインが切れているため、予約できませんでした。',
  )
  assert.equal(
    signedOut('保存'),
    'サインインが切れているため、保存できませんでした。',
  )
})

test('the sentence carries no status number and no instruction', () => {
  const said = signedOut('操作')

  assert.doesNotMatch(said, /ログイン|開き直|サインアウト/)
  assert.doesNotMatch(said, /\(\d{3}\)/)
})

test('a screen that says it reads this one place rather than spelling it again', async () => {
  const files: string[] = []

  for (const dir of WALKED) {
    files.push(...(await sourceFiles(dir)))
  }

  assert.ok(
    files.length > 150,
    `only ${files.length} source files were walked, so this test is reading the wrong tree`,
  )

  const spelling: string[] = []

  for (const file of files) {
    if ((await readFile(path.join(ROOT, file), 'utf8')).includes(HEAD)) {
      spelling.push(file)
    }
  }

  assert.deepEqual(
    spelling,
    [THE_ONE_PLACE],
    'The sentence a screen says when the session has ended is written out ' +
      'somewhere other than lib/signed-out.ts. It drifted into more than one ' +
      'spelling once already, which is why it lives in one place. Call ' +
      'signedOut() with what could not be done.',
  )
})
