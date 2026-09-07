import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

import { OUTCOME_KINDS, OUTCOME_SPANS } from '@/lib/reservation-outcomes'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DOCUMENT = path.join(
  HERE,
  '..',
  '..',
  'repository',
  'client',
  'carina.json',
)

test('分類の絞り込みは API の enum を一つも取りこぼさない', async () => {
  const document = JSON.parse(await readFile(DOCUMENT, 'utf8')) as {
    components: { schemas: Record<string, { enum?: (string | null)[] }> }
  }

  assert.deepEqual(
    [...OUTCOME_KINDS].sort(),
    [...(document.components.schemas.ReservationOutcomeKind.enum ?? [])].sort(),
  )
})

const LONGEST_SPAN_DAYS = 366

test('期間の選択肢は API が受ける長さに収まる', () => {
  for (const span of OUTCOME_SPANS) {
    assert.ok(Number(span.value) > 0)
    assert.ok(Number(span.value) < LONGEST_SPAN_DAYS)
  }
})
