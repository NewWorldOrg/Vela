import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { test } from 'node:test'

import {
  CANDIDATE_UNLOCKED_TERM,
  END_UNDECIDED_TERM,
  RECORDING_OUTCOME_TERMS,
  RESERVATION_OUTCOME_KIND_TERMS,
  RESERVATION_RECEPTION_TERM,
  RESERVATION_STANDING_TERMS,
  type StateTerm,
} from '@/lib/state-terms'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DOCUMENT = path.join(
  HERE,
  '..',
  '..',
  'repository',
  'client',
  'carina.json',
)

async function enumOf(name: string): Promise<string[]> {
  const document = JSON.parse(await readFile(DOCUMENT, 'utf8')) as {
    components: { schemas: Record<string, { enum?: (string | null)[] }> }
  }
  const values = document.components.schemas[name]?.enum

  assert.ok(values, `${name} is not in the OpenAPI document`)

  return values.filter((value): value is string => value !== null).sort()
}

test('予約の状態は API の enum を漏れなく説明している', async () => {
  assert.deepEqual(
    Object.keys(RESERVATION_STANDING_TERMS).sort(),
    await enumOf('ReservationStanding'),
  )
})

test('録画の結果は API の enum に「録画中」を足したもの', async () => {
  assert.deepEqual(
    Object.keys(RECORDING_OUTCOME_TERMS).sort(),
    [...(await enumOf('RecordingOutcome')), 'recording'].sort(),
  )
})

test('予約結果の分類は API の enum を漏れなく説明している', async () => {
  assert.deepEqual(
    Object.keys(RESERVATION_OUTCOME_KIND_TERMS).sort(),
    await enumOf('ReservationOutcomeKind'),
  )
})

const FROM_THE_REQUIREMENTS = {
  standing: {
    scheduled: 'チューナー確保済み',
    conflict: '競合',
    recording: '録画中',
    cancelled: '取消済み',
    truncated: '尻切れ',
    failed: '失敗',
  },
  outcome: {
    recording: '録画中',
    complete: '完全',
    truncated: '尻切れ',
    failed: '失敗',
  },
  outcomeKind: {
    competing: '競合',
    missed: '撮り逃し',
    tuneFailure: '選局失敗',
    recordingFailure: '録画失敗',
  },
} as const

test('要件文書の語がそのまま画面の語になっている', () => {
  for (const [state, word] of Object.entries(FROM_THE_REQUIREMENTS.standing)) {
    assert.equal(
      RESERVATION_STANDING_TERMS[
        state as keyof typeof RESERVATION_STANDING_TERMS
      ].label,
      word,
      `予約の ${state} は要件文書の「${word}」で呼ぶ`,
    )
  }

  for (const [state, word] of Object.entries(FROM_THE_REQUIREMENTS.outcome)) {
    assert.equal(
      RECORDING_OUTCOME_TERMS[state as keyof typeof RECORDING_OUTCOME_TERMS]
        .label,
      word,
      `録画の ${state} は要件文書の「${word}」で呼ぶ`,
    )
  }

  for (const [kind, word] of Object.entries(
    FROM_THE_REQUIREMENTS.outcomeKind,
  )) {
    assert.equal(
      RESERVATION_OUTCOME_KIND_TERMS[
        kind as keyof typeof RESERVATION_OUTCOME_KIND_TERMS
      ].label,
      word,
      `予約結果の ${kind} は要件文書の「${word}」で呼ぶ`,
    )
  }

  assert.equal(END_UNDECIDED_TERM.label, '終了未定')
  assert.equal(RESERVATION_RECEPTION_TERM.label, '受信不可')
})

test('同じ語の二つの意味は、別々に説明されている', () => {
  assert.equal(CANDIDATE_UNLOCKED_TERM.label, RESERVATION_RECEPTION_TERM.label)
  assert.notEqual(
    CANDIDATE_UNLOCKED_TERM.explanation,
    RESERVATION_RECEPTION_TERM.explanation,
  )
})

const EVERY_TERM: [string, StateTerm][] = [
  ...Object.entries(RESERVATION_STANDING_TERMS).map(
    ([state, term]): [string, StateTerm] => [`予約 ${state}`, term],
  ),
  ...Object.entries(RECORDING_OUTCOME_TERMS).map(
    ([state, term]): [string, StateTerm] => [`録画 ${state}`, term],
  ),
  ...Object.entries(RESERVATION_OUTCOME_KIND_TERMS).map(
    ([kind, term]): [string, StateTerm] => [`予約結果 ${kind}`, term],
  ),
  ['終了未定の印', END_UNDECIDED_TERM],
  ['予約の受信不可の印', RESERVATION_RECEPTION_TERM],
  ['候補chの受信不可の印', CANDIDATE_UNLOCKED_TERM],
]

const MARKS = 3

const SPOKEN = [
  {
    name: '想像上のメッセージの引用',
    pattern: /「[^」]{0,24}(しました|します)」/,
  },
  { name: '口語的な強調', pattern: /(一切|一度きり|きりです|だけです)/ },
  {
    name: 'システムを主語にした意思表明',
    pattern:
      /(作ります|作りません|消します|消しません|出します|出しません|譲ります|使いません|残します|量産|手を触れ|手が届か)/,
  },
]

test('説明は状態と条件を述べ、話し言葉の癖を持たない', async () => {
  assert.equal(
    EVERY_TERM.length,
    (await enumOf('ReservationStanding')).length +
      (await enumOf('RecordingOutcome')).length +
      1 +
      (await enumOf('ReservationOutcomeKind')).length +
      MARKS,
    '説明を集めそこねている(この数が合わないと、以下の検査は素通りする)',
  )

  for (const [name, term] of EVERY_TERM) {
    assert.ok(term.label.length > 0, `${name} に語がない`)
    assert.ok(
      term.explanation.endsWith('。'),
      `${name} の説明が句点で終わっていない: ${term.explanation}`,
    )
    assert.ok(
      term.explanation.length > term.label.length,
      `${name} の説明が語の言い直しにしかなっていない: ${term.explanation}`,
    )

    for (const { name: habit, pattern } of SPOKEN) {
      assert.doesNotMatch(
        term.explanation,
        pattern,
        `${name} の説明に${habit}がある: ${term.explanation}`,
      )
    }
  }
})
