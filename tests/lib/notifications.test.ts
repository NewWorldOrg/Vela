import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  deliveriesShown,
  deliverySaid,
  destinationsByDefault,
  eventLabelOf,
  eventsSummary,
  failureWord,
  goingToo,
  isLead,
  lastResultSaid,
  leadChipWords,
  leadLabel,
  leadToastWords,
  narrowedTo,
  nameFits,
  newestFirst,
  readAddress,
  registeringAs,
  ruleSetsFull,
  ruleSetsGoingWith,
  testSaid,
  toggled,
  webhookKindOf,
  withWhy,
  type DeliveryFailure,
  type NotificationDelivery,
  type NotificationEvent,
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
      'qualityIncidentDetected',
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
  assert.equal(eventLabelOf('qualityIncidentDetected'), '品質の異常の発生')
  assert.equal(eventLabelOf('qualityIncidentResolved'), '品質の異常の解消')
  assert.equal(eventLabelOf('somethingNew' as NotificationEvent), '未知の値')
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

test('each of the nine failures Carina names has a word of its own', () => {
  const words = [
    'timedOut',
    'rateLimited',
    'serverFailed',
    'unreachable',
    'rejected',
    'destinationDisabled',
    'unreadable',
    'tooOld',
    'tlsFailed',
  ].map((failure) => failureWord(failure as DeliveryFailure))

  assert.deepEqual(words, [
    '時間切れ',
    '回数の上限',
    '送り先の障害',
    'つながらない',
    '断られた',
    '送り先が無効',
    '開けない',
    '古くなった',
    '暗号化の失敗',
  ])
  assert.equal(failureWord('somethingNew' as DeliveryFailure), '未知の値')
  assert.equal(failureWord(undefined), undefined)
})

test('a destination nothing was sent to yet says nothing', () => {
  assert.equal(lastResultSaid({ readable: true }), undefined)
})

test('the last result of a destination is good, worth another try or over', () => {
  const now = Date.parse('2026-11-09T12:30:00Z')
  const lastResultAt = '2026-11-09T12:03:00Z'

  assert.deepEqual(lastResultSaid({ readable: true, lastResultAt }, now), {
    verdict: 'ok',
    words: '届いた 21:03',
  })

  for (const lastFailure of [
    'timedOut',
    'rateLimited',
    'serverFailed',
    'unreachable',
    'tlsFailed',
  ] as const) {
    assert.deepEqual(
      lastResultSaid({ readable: true, lastResultAt, lastFailure }, now),
      {
        verdict: 'warn',
        words: '届いていない',
        why: failureWord(lastFailure),
      },
      lastFailure,
    )
  }

  for (const lastFailure of [
    'rejected',
    'destinationDisabled',
    'unreadable',
    'tooOld',
  ] as const) {
    assert.deepEqual(
      lastResultSaid({ readable: true, lastResultAt, lastFailure }, now),
      {
        verdict: 'err',
        words: '届かなかった',
        why: failureWord(lastFailure),
      },
      lastFailure,
    )
  }
})

test('a destination whose address cannot be opened says so before anything else', () => {
  assert.deepEqual(
    lastResultSaid({
      readable: false,
      lastResultAt: '2026-11-09T12:03:00Z',
    }),
    { verdict: 'err', words: '開けない' },
  )
})

test('a delivery wears its reason only while it has not arrived', () => {
  const delivery: NotificationDelivery = {
    id: 'd',
    kind: 'recordingTruncated',
    occurredAt: '2026-11-09T12:03:00Z',
    destinationId: 'a',
    state: 'sent',
  }

  assert.deepEqual(deliverySaid(delivery), { verdict: 'ok', words: '届いた' })
  assert.equal(
    withWhy(
      deliverySaid({ ...delivery, state: 'failed', failure: 'timedOut' }),
    ),
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
    withWhy(testSaid({ state: 'ok', delivered: false, failure: 'timedOut' })),
    '届かなかった · 時間切れ',
  )
  assert.equal(
    withWhy(testSaid({ state: 'ok', delivered: false })),
    '届かなかった',
  )
})

test('the rule sets that send to one destination alone go with it', () => {
  const ruleSets = [
    { name: '困ったときだけ', destinations: ['a', 'b'] },
    { name: '録画の記録', destinations: ['b'] },
    { name: '留守の週', destinations: ['b'] },
    { name: '機器だけ', destinations: ['a'] },
  ]

  assert.deepEqual(
    ruleSetsGoingWith('b', ruleSets).map(({ name }) => name),
    ['録画の記録', '留守の週'],
  )
  assert.deepEqual(ruleSetsGoingWith('c', ruleSets), [])
  assert.equal(
    goingToo(['録画の記録', '留守の週']),
    'ルールセット「録画の記録」「留守の週」も削除します。',
  )
  assert.equal(goingToo([]), undefined)
})

function sentAt(
  id: string,
  occurredAt: string,
  destinationId: string,
): NotificationDelivery {
  return {
    id,
    kind: 'recordingStarted',
    occurredAt,
    destinationId,
    state: 'sent',
  }
}

test('the deliveries of several destinations read as one log, the newest first', () => {
  const log = newestFirst([
    sentAt('1', '2026-11-09T10:00:00Z', 'a'),
    sentAt('2', '2026-11-09T12:00:00.5Z', 'a'),
    sentAt('3', '2026-11-09T12:00:00Z', 'b'),
  ])

  assert.deepEqual(
    log.map(({ id }) => id),
    ['2', '3', '1'],
  )
})

test('the log is narrowed to a destination only while that destination is held', () => {
  const destinations = [{ id: 'a' }, { id: 'b' }]

  assert.equal(narrowedTo(destinations, 'b'), 'b')
  assert.equal(narrowedTo(destinations, undefined), undefined)
  assert.equal(narrowedTo(destinations, 'gone'), undefined)
})

test('the log lists fifty rows of every destination, or of the one it is narrowed to', () => {
  const log = Array.from({ length: 120 }, (_, index) =>
    sentAt(String(index), '2026-11-09T12:00:00Z', index % 2 === 0 ? 'a' : 'b'),
  )

  assert.deepEqual(
    deliveriesShown(log, undefined).map(({ id }) => id),
    log.slice(0, 50).map(({ id }) => id),
  )
  assert.equal(deliveriesShown(log, 'b').length, 50)
  assert.ok(deliveriesShown(log, 'b').every((one) => one.destinationId === 'b'))
  assert.deepEqual(deliveriesShown(log, 'gone'), [])
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
