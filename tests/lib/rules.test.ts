import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { SearchTerms } from '@/lib/search-condition'
import {
  RULE_NAME_LONGEST,
  ruleConditionParts,
  ruleNarrowsAnything,
  withinRuleName,
} from '@/lib/rules'

const NOTHING: SearchTerms = {
  fields: 'title,description',
  genres: [],
  channels: [],
}

const named = (id: string) =>
  ({ '131-1310': '中央テレビ1', '4-101': '衛星第一' })[id] ?? id

test('a name is asked for, and is not longer than the API keeps', () => {
  assert.equal(withinRuleName('深夜アニメを追う'), true)
  assert.equal(withinRuleName(''), false)
  assert.equal(withinRuleName('   '), false)
  assert.equal(withinRuleName('あ'.repeat(RULE_NAME_LONGEST)), true)
  assert.equal(withinRuleName('あ'.repeat(RULE_NAME_LONGEST + 1)), false)
})

test('each condition on its own narrows the guide', () => {
  assert.equal(ruleNarrowsAnything({ ...NOTHING, q: '新番組' }), true)
  assert.equal(ruleNarrowsAnything({ ...NOTHING, exclude: '再放送' }), true)
  assert.equal(ruleNarrowsAnything({ ...NOTHING, genres: ['anime'] }), true)
  assert.equal(ruleNarrowsAnything({ ...NOTHING, kind: 'bs' }), true)
  assert.equal(ruleNarrowsAnything({ ...NOTHING, channels: ['4-101'] }), true)
})

test('naming where to look narrows nothing, and neither does a span', () => {
  assert.equal(ruleNarrowsAnything(NOTHING), false)
  assert.equal(ruleNarrowsAnything({ ...NOTHING, fields: 'title' }), false)
  assert.equal(
    ruleNarrowsAnything({ ...NOTHING, from: '2026-08-08', to: '2026-08-09' }),
    false,
  )
})

test('the conditions read back in the order the form asks for them', () => {
  assert.deepEqual(
    ruleConditionParts(
      {
        q: '新番組',
        exclude: '再放送',
        fields: 'title',
        genres: ['anime', 'movie'],
        kind: 'bs',
        channels: ['4-101'],
      },
      named,
    ),
    [
      '「新番組」',
      '除外「再放送」',
      '番組名だけ',
      'ジャンル: アニメ/特撮・映画',
      'BS',
      '衛星第一',
    ],
  )
})

test('an unanswered condition takes no room in the summary', () => {
  assert.deepEqual(ruleConditionParts({ ...NOTHING, q: '新番組' }, named), [
    '「新番組」',
    'すべてのチャンネル',
  ])
})

test('the channels are named one by one until there are too many to read', () => {
  assert.deepEqual(
    ruleConditionParts({ ...NOTHING, channels: ['4-101'] }, named).at(-1),
    '衛星第一',
  )
  assert.deepEqual(
    ruleConditionParts(
      { ...NOTHING, channels: ['4-101', '131-1310'] },
      named,
    ).at(-1),
    '2 チャンネル',
  )
})
