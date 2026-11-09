import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  deliverySaid,
  destinationsByDefault,
  eventLabelOf,
  eventsSummary,
  isLead,
  lastResultSaid,
  leadChipWords,
  leadLabel,
  leadToastWords,
  nameFits,
  readAddress,
  registeringAs,
  ruleSetsFull,
  testSaid,
  toggled,
  webhookKindOf,
  withWhy,
  type NotificationDelivery,
} from '@/lib/notifications'

test('a Slack address is Slack, and both Discord hosts are Discord under their webhook path', () => {
  assert.equal(
    webhookKindOf('https://hooks.slack.com/services/T000/B000/XXXX'),
    'slack',
  )
  assert.equal(
    webhookKindOf('https://discord.com/api/webhooks/1234/abcd'),
    'discord',
  )
  assert.equal(
    webhookKindOf('https://discordapp.com/api/webhooks/1234/abcd'),
    'discord',
  )
  assert.equal(
    webhookKindOf('  https://HOOKS.SLACK.COM:443/services/T000  '),
    'slack',
  )
})

test('an address Carina refuses has no kind', () => {
  for (const refused of [
    '',
    'hooks.slack.com/services/T000',
    'http://hooks.slack.com/services/T000',
    'https://hooks.slack.com:8443/services/T000',
    'https://hooks.slack.com.evil.example/services/T000',
    'https://user:secret@hooks.slack.com/services/T000',
    'https://127.0.0.1/services/T000',
    'https://[::ffff:10.0.0.3]/api/webhooks/1',
    'https://discord.com/channels/1234',
    'https://hook.example.jp/carina',
  ]) {
    assert.equal(webhookKindOf(refused), undefined, refused)
  }
})

test('an empty address says nothing, a refused one says so, and a good one names its kind', () => {
  assert.deepEqual(readAddress('  '), { refused: false })
  assert.deepEqual(readAddress('https://hook.example.jp/carina'), {
    kind: undefined,
    refused: true,
  })
  assert.deepEqual(readAddress('https://hooks.slack.com/services/T0'), {
    kind: 'slack',
    refused: false,
  })
})

test('the line under the address names the service it will be kept as', () => {
  assert.equal(registeringAs('slack'), 'Slack として登録します')
  assert.equal(registeringAs('discord'), 'Discord として登録します')
})

test('a rule set says its events group by group, each group after its prefix', () => {
  assert.equal(
    eventsSummary([
      'recordingTruncated',
      'recordingFailed',
      'encodeFailed',
      'reservationCompeting',
      'reservationMissed',
      'qualityRaised',
      'deviceDisconnected',
    ]),
    '録画の欠け・失敗 · エンコードの失敗 · 競合・取り逃し · 異常の発生 · 切断',
  )
  assert.equal(
    eventsSummary([
      'encodeCompleted',
      'recordingCompleted',
      'recordingStarted',
    ]),
    '録画の開始・完了 · エンコードの完了',
  )
  assert.equal(eventsSummary([]), 'なし')
})

test('every event has a label, and one this build does not know is said as such', () => {
  assert.equal(eventLabelOf('programmeStarting'), '放送開始の通知')
  assert.equal(eventLabelOf('qualityRaised'), '品質の異常の発生')
  assert.equal(
    eventLabelOf('somethingNew' as NotificationDelivery['event']),
    '未知の値',
  )
})

test('the lead is said as the start itself or minutes before it', () => {
  assert.equal(leadLabel(0), '開始時')
  assert.equal(leadLabel(3), '3 分前')
  assert.equal(leadChipWords(0), '開始時に通知')
  assert.equal(leadChipWords(10), '開始 10 分前に通知')
  assert.equal(leadToastWords(0), '開始時に通知します')
  assert.equal(leadToastWords(3), '開始の 3 分前に通知します')
  assert.ok(isLead(5))
  assert.ok(!isLead(2))
})

test('the last result of a destination is good, being retried or given up', () => {
  const now = Date.parse('2026-11-09T12:30:00Z')

  assert.deepEqual(
    lastResultSaid({ state: 'sent', at: '2026-11-09T12:03:00Z' }, now),
    { verdict: 'ok', words: '届いた 21:03' },
  )
  assert.deepEqual(
    lastResultSaid(
      { state: 'failed', at: '2026-11-09T12:03:00Z', failure: 'timeout' },
      now,
    ),
    { verdict: 'warn', words: '届いていない', why: '時間切れ' },
  )
  assert.deepEqual(
    lastResultSaid(
      { state: 'givenUp', at: '2026-11-09T12:03:00Z', failure: 'rejected' },
      now,
    ),
    { verdict: 'err', words: '届かなかった', why: '断られた' },
  )
})

test('a delivery wears its reason only while it has not arrived', () => {
  const delivery: NotificationDelivery = {
    id: 'd',
    at: '2026-11-09T12:03:00Z',
    event: 'recordingTruncated',
    subject: '港町レシピ帖',
    destinationId: 'a',
    destinationName: '家の Slack',
    state: 'sent',
  }

  assert.deepEqual(deliverySaid(delivery), { verdict: 'ok', words: '届いた' })
  assert.equal(
    withWhy(deliverySaid({ ...delivery, state: 'failed', failure: 'timeout' })),
    '送り直し中 · 時間切れ',
  )
  assert.equal(
    withWhy(
      deliverySaid({ ...delivery, state: 'givenUp', failure: 'rejected' }),
    ),
    '届かなかった · 断られた',
  )
  assert.equal(
    withWhy(deliverySaid({ ...delivery, state: 'queued' })),
    '送信待ち',
  )
  assert.deepEqual(
    deliverySaid({
      ...delivery,
      state: 'bounced' as NotificationDelivery['state'],
    }),
    { verdict: 'calm', words: '未知の値' },
  )
})

test('a test send says whether it arrived, and why not when it did not', () => {
  assert.equal(withWhy(testSaid({ state: 'ok', delivered: true })), '届いた')
  assert.equal(
    withWhy(testSaid({ state: 'ok', delivered: false, failure: 'timeout' })),
    '届かなかった · 時間切れ',
  )
})

test('rule sets stop at twenty', () => {
  assert.ok(!ruleSetsFull(19))
  assert.ok(ruleSetsFull(20))
})

test('a name is one to sixty-four characters once trimmed', () => {
  assert.ok(!nameFits('   '))
  assert.ok(nameFits(' 家の Slack '))
  assert.ok(nameFits('あ'.repeat(64)))
  assert.ok(!nameFits('あ'.repeat(65)))
})

test('a new single notice goes to every destination that is on', () => {
  assert.deepEqual(
    destinationsByDefault([
      { id: 'a', enabled: true },
      { id: 'b', enabled: false },
      { id: 'c', enabled: true },
    ]),
    ['a', 'c'],
  )
})

test('a choice toggles in and out', () => {
  assert.deepEqual(toggled(['a', 'b'], 'a'), ['b'])
  assert.deepEqual(toggled(['b'], 'a'), ['b', 'a'])
})
