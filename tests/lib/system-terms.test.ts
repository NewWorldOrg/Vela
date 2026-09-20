import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

import { SYSTEM_DETAIL_LABELS } from '@/lib/system-terms'

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

const SCREEN = 'components/system/system-page.tsx'

const COINED = /版|観測/

test('the detail rows are named in words a reader already has', () => {
  assert.equal(SYSTEM_DETAIL_LABELS.version, 'バージョン')
  assert.equal(SYSTEM_DETAIL_LABELS.protocolVersion, 'プロトコルバージョン')
  assert.equal(SYSTEM_DETAIL_LABELS.observedAt, '取得日時')

  assert.deepEqual(
    Object.entries(SYSTEM_DETAIL_LABELS).filter(([, label]) =>
      COINED.test(label),
    ),
    [],
    'A detail row is named with a word coined for this screen. 版 / 版数 / ' +
      '観測 read as this application talking to itself; the row names are ' +
      'the words a reader brings with them.',
  )
})

test('the screen takes every detail name from the one table', async () => {
  const source = await readFile(path.join(ROOT, SCREEN), 'utf8')

  const named = [...source.matchAll(/<DetailRow\s+label=(\{[^}]*\}|"[^"]*")/g)]

  assert.deepEqual(
    named.map((one) => one[1]),
    Object.keys(SYSTEM_DETAIL_LABELS).map(
      (key) => `{SYSTEM_DETAIL_LABELS.${key}}`,
    ),
    'A detail row spells its own name instead of taking it from ' +
      'SYSTEM_DETAIL_LABELS. Two spellings of one word drift apart, and the ' +
      'table is what the wording is checked against.',
  )
})
