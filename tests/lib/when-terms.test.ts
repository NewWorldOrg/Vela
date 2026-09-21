import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

import { WHEN_LABELS, WHEN_MARKS } from '@/lib/when-terms'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const READS = ['app', 'components', 'lib', 'repository']

const RETIRED = ['記録日時', '最終利用', '最終確認', '最終サービス取得', '破棄']

function everySourceFile(from: string): string[] {
  const here = path.join(ROOT, from)
  const found: string[] = []

  for (const entry of readdirSync(here)) {
    const full = path.join(here, entry)

    if (statSync(full).isDirectory()) {
      found.push(...everySourceFile(path.join(from, entry)))
    } else if (/\.tsx?$/.test(entry) && !entry.includes('.fixtures.')) {
      found.push(path.join(from, entry))
    }
  }

  return found
}

test('every heading for a time is the same table read twice', () => {
  assert.deepEqual(Object.keys(WHEN_LABELS), Object.keys(WHEN_MARKS))

  for (const [kind, label] of Object.entries(WHEN_LABELS)) {
    assert.equal(label, `${WHEN_MARKS[kind as keyof typeof WHEN_MARKS]}日時`)
  }

  assert.equal(new Set(Object.values(WHEN_LABELS)).size, 3)
})

test('no screen spells a heading for a time of its own', () => {
  const spelled = READS.flatMap(everySourceFile)
    .filter((file) => file !== path.join('lib', 'when-terms.ts'))
    .flatMap((file) => {
      const read = readFileSync(path.join(ROOT, file), 'utf8')

      return [...Object.values(WHEN_LABELS), ...RETIRED]
        .filter((word) => read.includes(word))
        .map((word) => `${file}: ${word}`)
    })

  assert.deepEqual(spelled, [])
})
