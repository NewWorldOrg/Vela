import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { SearchTerms } from '@/lib/search-condition'
import { searchConditionOfQuery, searchTermsOf } from '@/lib/search-condition'
import type { RuleTerms } from '@/lib/rules'
import {
  NEW_RULE,
  exclusionPartsOf,
  RULE_DAY_OPTIONS,
  RULE_NAME_LONGEST,
  RULE_PARAM,
  newRuleHref,
  ruleApplicationFellShort,
  ruleApplicationPartsOf,
  ruleConditionParts,
  ruleDayLabelOf,
  ruleDaysInOrder,
  ruleNarrowsAnything,
  rulePeriodLabelOf,
  ruleTermsOfSearch,
  seriesTermsOf,
  withinRuleName,
  withinRulePeriod,
} from '@/lib/rules'

const A_DAY_IN_2026 = '2026-08-20T03:00:00Z'

const NOTHING: RuleTerms = {
  fields: 'title,description',
  genres: [],
  subgenres: [],
  channels: [],
  days: [],
  beyond: [],
}

const named = (id: string) =>
  ({ '131-1310': '中央テレビ1', '4-101': '衛星第一' })[id] ?? id

const A_SERIES: SearchTerms = seriesTermsOf('星のさまよいびと 第1話', '4-101')!

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
  assert.equal(ruleNarrowsAnything({ ...NOTHING, subgenres: ['7-0'] }), true)
  assert.equal(ruleNarrowsAnything({ ...NOTHING, days: ['monday'] }), true)
  assert.equal(ruleNarrowsAnything({ ...NOTHING, from: '2026-08-08' }), true)
  assert.equal(ruleNarrowsAnything({ ...NOTHING, to: '2026-08-09' }), true)
})

test('a condition the screen cannot read is left for the API to weigh', () => {
  assert.equal(
    ruleNarrowsAnything({ ...NOTHING, beyond: [['hour', '22']] }),
    true,
  )
})

test('naming where to look narrows nothing, and neither does every day of the week', () => {
  assert.equal(ruleNarrowsAnything(NOTHING), false)
  assert.equal(ruleNarrowsAnything({ ...NOTHING, fields: 'title' }), false)
  assert.equal(
    ruleNarrowsAnything({
      ...NOTHING,
      days: RULE_DAY_OPTIONS.map((option) => option.value),
    }),
    false,
  )
})

test('what a search hands over becomes a rule with nothing added to it', () => {
  assert.deepEqual(ruleTermsOfSearch(A_SERIES), {
    ...A_SERIES,
    subgenres: [],
    days: [],
    beyond: [],
  })
})

test('the conditions read back in the order the form asks for them', () => {
  assert.deepEqual(
    ruleConditionParts(
      {
        q: '新番組',
        exclude: '再放送',
        fields: 'title',
        genres: ['anime', 'movie'],
        subgenres: ['3-1', '8-15'],
        kind: 'bs',
        channels: ['4-101'],
        days: ['monday', 'saturday'],
        from: '2026-08-08',
        to: '2026-08-31',
        beyond: [],
      },
      named,
      A_DAY_IN_2026,
    ),
    [
      '「新番組」',
      '除外「再放送」',
      '番組名だけ',
      'ジャンル: アニメ/特撮・映画・海外ドラマ(ドラマ)・その他(ドキュメンタリー/教養)',
      'BS',
      '曜日: 月・土',
      '期間: 08/08(土) 〜 08/31(月)',
      '衛星第一',
    ],
  )
})

test('subgenres alone are summed up under the same heading as genres', () => {
  assert.deepEqual(
    ruleConditionParts({ ...NOTHING, subgenres: ['7-0'] }, named),
    ['ジャンル: 国内アニメ(アニメ/特撮)', 'すべてのチャンネル'],
  )
})

test('a span open at one end says which end it has', () => {
  assert.equal(
    rulePeriodLabelOf('2026-08-08', undefined, A_DAY_IN_2026),
    '08/08(土) 〜',
  )
  assert.equal(
    rulePeriodLabelOf(undefined, '2026-08-31', A_DAY_IN_2026),
    '〜 08/31(月)',
  )
  assert.equal(
    rulePeriodLabelOf('2026-12-20', '2027-01-10', A_DAY_IN_2026),
    '12/20(日) 〜 2027/01/10(日)',
  )
})

test('a span runs forward and is no longer than the API takes', () => {
  assert.equal(withinRulePeriod(undefined, undefined), true)
  assert.equal(withinRulePeriod('2026-08-08', undefined), true)
  assert.equal(withinRulePeriod(undefined, '2026-08-08'), true)
  assert.equal(withinRulePeriod('2026-08-08', '2026-08-08'), true)
  assert.equal(withinRulePeriod('2026-08-01', '2026-08-31'), true)
  assert.equal(withinRulePeriod('2026-08-01', '2026-09-01'), false)
  assert.equal(withinRulePeriod('2026-08-09', '2026-08-08'), false)
})

test('days are kept in the order of the week, whatever order they were picked in', () => {
  assert.deepEqual(ruleDaysInOrder(['sunday', 'wednesday', 'monday']), [
    'monday',
    'wednesday',
    'sunday',
  ])
  assert.equal(ruleDayLabelOf('wednesday'), '水曜')
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

test('a series is asked for by the main title on the channel it came from', () => {
  assert.deepEqual(seriesTermsOf('星のさまよいびと 第1話', '4-101'), {
    q: '星のさまよいびと',
    exclude: undefined,
    fields: 'title',
    genres: [],
    kind: undefined,
    channels: ['4-101'],
  })
})

test('a series drops the marks and the trailing labels the title carries', () => {
  assert.equal(
    seriesTermsOf('【新】未明のレイライン▽第1話🈑', '131-1310')?.q,
    '未明のレイライン',
  )
})

test('a channel on its own passes the gate, so a nameless programme hands nothing over', () => {
  assert.equal(ruleNarrowsAnything({ ...NOTHING, channels: ['4-101'] }), true)
  assert.equal(seriesTermsOf('', '4-101'), undefined)
  assert.equal(seriesTermsOf('　  ', '4-101'), undefined)
})

test('a draft is opened on the rules screen, which is where the impact is shown', () => {
  const href = newRuleHref(A_SERIES)
  const [path, query] = href.split('?')

  assert.equal(path, '/reservations/rules')
  assert.equal(new URLSearchParams(query).get(RULE_PARAM), NEW_RULE)
})

test('the draft the rules screen reads back is the one that was handed over', () => {
  const query = newRuleHref(A_SERIES).split('?')[1]

  assert.deepEqual(searchTermsOf(searchConditionOfQuery(query)), {
    ...A_SERIES,
    from: undefined,
    to: undefined,
  })
})

test('a draft that narrows nothing still opens the rules screen', () => {
  assert.equal(
    newRuleHref(NOTHING),
    `/reservations/rules?${RULE_PARAM}=${NEW_RULE}`,
  )
})

test('除外は種類ごとに、0 件でない種類だけを言う', () => {
  assert.deepEqual(exclusionPartsOf({ shadows: 2, moved: 1 }), [
    { label: '同時放送', count: 2 },
    { label: '移動', count: 1 },
  ])
  assert.deepEqual(exclusionPartsOf({ shadows: 0, moved: 3 }), [
    { label: '移動', count: 3 },
  ])
  assert.deepEqual(exclusionPartsOf({ shadows: 0, moved: 0 }), [])
})

const APPLIED_CLEANLY = {
  made: 0,
  withdrawn: 0,
  refused: 0,
  turnedOff: 0,
  faulted: 0,
}

test('an application always says how many reservations it made, even none', () => {
  assert.deepEqual(ruleApplicationPartsOf(APPLIED_CLEANLY), [
    { label: '新しく作られた予約', count: 0 },
  ])
  assert.equal(ruleApplicationFellShort(APPLIED_CLEANLY), false)
})

test('an application names the rest only when it counted any of them, in a fixed order', () => {
  const applied = {
    made: 3,
    withdrawn: 1,
    refused: 2,
    turnedOff: 1,
    faulted: 4,
  }

  assert.deepEqual(ruleApplicationPartsOf(applied), [
    { label: '新しく作られた予約', count: 3 },
    { label: '引っ込んだ予約', count: 1 },
    { label: '作成できなかった予約', count: 2 },
    { label: '条件を読めず無効にしたルール', count: 1 },
    { label: '調べられなかったルール', count: 4 },
  ])
  assert.deepEqual(
    ruleApplicationPartsOf({ ...APPLIED_CLEANLY, made: 2, withdrawn: 1 }),
    [
      { label: '新しく作られた予約', count: 2 },
      { label: '引っ込んだ予約', count: 1 },
    ],
  )
})

test('an application fell short when a reservation was not made or a rule was not read', () => {
  assert.equal(
    ruleApplicationFellShort({ ...APPLIED_CLEANLY, made: 2, withdrawn: 5 }),
    false,
  )
  assert.equal(
    ruleApplicationFellShort({ ...APPLIED_CLEANLY, refused: 1 }),
    true,
  )
  assert.equal(
    ruleApplicationFellShort({ ...APPLIED_CLEANLY, turnedOff: 1 }),
    true,
  )
  assert.equal(
    ruleApplicationFellShort({ ...APPLIED_CLEANLY, faulted: 1 }),
    true,
  )
})
