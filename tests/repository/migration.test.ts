import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

import {
  NOT_YET_IN_THIS_BUILD,
  NOT_YET_IN_THIS_BUILD_SAYING,
} from '@/lib/not-yet-in-this-build'

interface Sent {
  path: string
  query: Record<string, unknown>
}

interface Over {
  [key: string]: unknown
}

const sent: Sent[] = []

const store: {
  pages: unknown[]
  status: number
  message: string
} = { pages: [], status: 200, message: '' }

const answered = (status: number) => ({ status, ok: status < 400 })

const run = (over: Over = {}) => ({
  id: '3f6c9b41-8e02-4d7a-9c15-2b8d40f7e6a3',
  source: 'the recording system being replaced',
  pass: 'forReal',
  startedAt: '2026-08-10T03:12:04+09:00',
  finishedAt: '2026-08-10T03:18:46+09:00',
  rehearsals: 4,
  lastRehearsalFinishedAt: '2026-08-09T22:41:00+09:00',
  ...over,
})

const population = (over: Over = {}) => ({
  population: 'recordings',
  offered: 53,
  carried: 51,
  notCarried: 2,
  unclassified: 0,
  ...over,
})

const EVERY_REFUSAL = [
  'reallyEmpty',
  'fileMissing',
  'orphan',
  'unidentifiable',
  'inexpressible',
  'noSuchFeature',
  'outOfScope',
] as const

const refusals = (counts: Partial<Record<string, number>> = {}) =>
  EVERY_REFUSAL.map((refusal) => ({ refusal, count: counts[refusal] ?? 0 }))

const detail = (over: Over = {}) => ({
  id: '9a1e5d3c-7b40-42f8-8e6a-1c95b207f4d8',
  population: 'recordings',
  refusal: 'reallyEmpty',
  subject: '7',
  note: '真夜中の音楽室',
  claimed: 3000000000,
  observed: 0,
  ...over,
})

const loss = (over: Over = {}) => ({
  subject: 'duplicateAvoidance',
  affected: 17,
  ...over,
})

const page = (items: unknown[], over: Over = {}) => ({
  run: run(),
  populations: [population()],
  unclassified: 0,
  refusals: refusals({ reallyEmpty: items.length }),
  losses: [loss()],
  items,
  total: items.length,
  currentPage: 1,
  lastPage: 1,
  perPage: 500,
  ...over,
})

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({
      GET: async (path: string, init?: { params?: { query?: object } }) => {
        const query = (init?.params?.query ?? {}) as Record<string, unknown>

        sent.push({ path, query })

        if (store.status !== 200) {
          return {
            data: undefined,
            error: { status: false, message: store.message, data: null },
            response: answered(store.status),
          }
        }

        const asked = Number(query.page ?? 1)

        return {
          data: {
            status: true,
            message: '',
            data: store.pages[asked - 1] ?? store.pages[0],
          },
          response: answered(200),
        }
      },
    }),
    revalidatingCarinaClient: () => {
      throw new Error('the migration record does not revalidate')
    },
  },
})

const { getMigration, hasMigrationRecord } =
  await import('@/repository/migration')

function standing(pages: unknown[]): void {
  sent.length = 0
  store.pages = pages
  store.status = 200
  store.message = ''
}

test('a migration that has never been run is answered as no record', async () => {
  standing([page([], { run: null, populations: [], refusals: refusals() })])

  assert.equal(await getMigration(), null)
})

test('the navigation is told there is no record when nothing has ever run', async () => {
  standing([page([], { run: null, populations: [], refusals: refusals() })])

  assert.equal(await hasMigrationRecord(), false)
  assert.deepEqual(sent[0].query, { page: 1, perPage: 1 })
})

test('the navigation is told there is a record once one exists', async () => {
  standing([page([detail()])])

  assert.equal(await hasMigrationRecord(), true)
})

test('the run is spelled out of the instants and the pass it is given', async () => {
  standing([page([detail()])])

  const result = await getMigration()

  assert.ok(result)
  assert.equal(result.run.heading, '2026/08/10 03:12 の実行')
  assert.equal(result.run.kind, '本番')
  assert.equal(result.run.rehearsals, '下見 4 回')
  assert.equal(result.run.duration, '所要 6分42.000秒')
  assert.equal(result.run.lastRehearsal, '2026/08/09 22:41')
})

test('the source is said in Japanese, not in the words the record keeps it in', async () => {
  standing([page([detail()])])

  const result = await getMigration()

  assert.ok(result)
  assert.equal(result.run.source, '現行の録画システム')
})

test('a source no saying is held for is not passed through to the screen', async () => {
  standing([
    page([detail()], { run: run({ source: 'a system nobody named' }) }),
  ])

  const result = await getMigration()

  assert.ok(result)
  assert.doesNotMatch(result.run.source, /[A-Za-z]/)
})

test('a rehearsal says so, and a run with no rehearsal before it says that', async () => {
  standing([
    page([detail()], {
      run: run({
        pass: 'rehearsal',
        rehearsals: 0,
        lastRehearsalFinishedAt: null,
      }),
    }),
  ])

  const result = await getMigration()

  assert.ok(result)
  assert.equal(result.run.kind, '下見')
  assert.equal(result.run.rehearsals, '下見なし')
  assert.equal(result.run.lastRehearsal, '—')
})

test('every refusal the record can name becomes a group of its own', async () => {
  standing([page([detail()])])

  const result = await getMigration()

  assert.ok(result)
  assert.equal(result.notTakenGroups.length, EVERY_REFUSAL.length)
  assert.equal(new Set(result.notTakenGroups.map((one) => one.name)).size, 7)
})

test('a refusal nothing fell under is shown as a group with nothing in it', async () => {
  standing([page([detail()])])

  const result = await getMigration()

  assert.ok(result)
  const empty = result.notTakenGroups.find((one) => one.rows.length === 0)

  assert.ok(empty)
  assert.equal(empty.count, '0')
  assert.equal(empty.empty, '該当なし')
})

test('a group is counted by the record, not by the rows that reached the page', async () => {
  standing([page([detail()], { refusals: refusals({ reallyEmpty: 2048 }) })])

  const result = await getMigration()

  assert.ok(result)
  const group = result.notTakenGroups.find((one) => one.rows.length === 1)

  assert.ok(group)
  assert.equal(group.count, '2,048')
})

test('a group says once, in its heading, what fell under it', async () => {
  standing([page([detail(), detail({ id: 'b' })])])

  const result = await getMigration()

  assert.ok(result)
  const group = result.notTakenGroups.find((one) => one.name === '実 0 バイト')

  assert.ok(group)
  assert.equal(group.reason, '記録されたサイズに対して実ファイルが空')
  assert.deepEqual(
    group.rows.filter((row) => row.fact.includes('実ファイルが空')),
    [],
  )
})

test('a group nothing fell under still says what it is for', async () => {
  standing([page([detail()])])

  const result = await getMigration()

  assert.ok(result)
  const group = result.notTakenGroups.find((one) => one.name === '対象外')

  assert.ok(group)
  assert.equal(group.rows.length, 0)
  assert.equal(group.reason, 'ルール由来のため移行しない')
})

test('the one refusal whose name already reads as the reason adds nothing to it', async () => {
  standing([page([detail()])])

  const result = await getMigration()

  assert.ok(result)
  const group = result.notTakenGroups.find(
    (one) => one.name === '本システムに機能が無い',
  )

  assert.ok(group)
  assert.equal(group.reason, undefined)
})

test('every other group is given a reason to stand under its name', async () => {
  standing([page([detail()])])

  const result = await getMigration()

  assert.ok(result)
  assert.deepEqual(
    result.notTakenGroups
      .filter((one) => one.reason === undefined)
      .map((one) => one.name),
    ['本システムに機能が無い'],
  )
})

test('a row is named by the name a person reads, not by the row it came from', async () => {
  standing([page([detail()])])

  const result = await getMigration()

  assert.ok(result)
  const row = result.notTakenGroups.flatMap((one) => one.rows)[0]

  assert.equal(row.subject, '真夜中の音楽室')
  assert.equal(row.population, '録画')
})

test('the number the source ledger kept a row under never reaches the screen', async () => {
  standing([page([detail({ subject: '4821' })])])

  const result = await getMigration()

  assert.ok(result)
  const row = result.notTakenGroups.flatMap((one) => one.rows)[0]

  assert.doesNotMatch(row.subject, /4821/)
  assert.doesNotMatch(row.fact, /4821/)
})

test('a row whose name and note are the same word does not say it twice', async () => {
  const named = '2026年04月06日22時00分00秒-真夜中の音楽室.m2ts'

  standing([
    page([
      detail({
        population: 'recordingFiles',
        subject: named,
        note: named,
        claimed: null,
        observed: 0,
      }),
    ]),
  ])

  const result = await getMigration()

  assert.ok(result)
  const row = result.notTakenGroups.flatMap((one) => one.rows)[0]

  assert.equal(row.subject, named)
  assert.equal(row.fact, '0 B')
  assert.doesNotMatch(row.fact, /真夜中の音楽室/)
})

test('a row carries what was claimed beside what was found', async () => {
  standing([page([detail()])])

  const result = await getMigration()

  assert.equal(
    result?.notTakenGroups.flatMap((one) => one.rows)[0].fact,
    '0 B(記録上 3,000,000,000 B)',
  )
})

test('a row with only one of the two sizes says only that one', async () => {
  standing([page([detail({ claimed: null, observed: 539 })])])

  const found = await getMigration()

  assert.equal(
    found?.notTakenGroups.flatMap((one) => one.rows)[0].fact,
    '539 B',
  )

  standing([page([detail({ claimed: 12, observed: null })])])

  const other = await getMigration()

  assert.equal(
    other?.notTakenGroups.flatMap((one) => one.rows)[0].fact,
    '記録上 12 B',
  )
})

test('a row nothing was measured on leaves the fact standing as a dash', async () => {
  standing([page([detail({ claimed: null, observed: null })])])

  const result = await getMigration()

  assert.equal(result?.notTakenGroups.flatMap((one) => one.rows)[0].fact, '—')
})

test('every detail row is read, not only the first page', async () => {
  const first = page([detail({ id: 'a', note: '一つめ' })], {
    total: 3,
    currentPage: 1,
    lastPage: 3,
    refusals: refusals({ reallyEmpty: 3 }),
  })
  const second = page([detail({ id: 'b', note: '二つめ' })], {
    total: 3,
    currentPage: 2,
    lastPage: 3,
    refusals: refusals({ reallyEmpty: 3 }),
  })
  const third = page([detail({ id: 'c', note: '三つめ' })], {
    total: 3,
    currentPage: 3,
    lastPage: 3,
    refusals: refusals({ reallyEmpty: 3 }),
  })

  standing([first, second, third])

  const result = await getMigration()

  assert.ok(result)
  assert.deepEqual(
    result.notTakenGroups.flatMap((one) => one.rows).map((one) => one.subject),
    ['一つめ', '二つめ', '三つめ'],
  )
  assert.deepEqual(
    sent.map((one) => one.query.page),
    [1, 2, 3],
  )
})

test('a loss is said as what it was and how many it took with it', async () => {
  standing([
    page([detail()], {
      losses: [loss(), loss({ subject: 'enclosedCharacters', affected: 1056 })],
    }),
  ])

  const result = await getMigration()

  assert.ok(result)
  assert.deepEqual(result.losses[0], {
    id: 'duplicateAvoidance',
    subject: 'ルールの重複録画防止',
    fact: '運んだ 17 件のルールがこの設定を失った',
  })
  assert.deepEqual(result.losses[1], {
    id: 'enclosedCharacters',
    subject: '番組名の囲み文字',
    fact: '運んだ 1,056 本の題名が元の文字に戻せない',
  })
})

test('the day boundary is said as the rules whose day slid by one', async () => {
  standing([
    page([detail()], {
      losses: [loss({ subject: 'dayBoundary', affected: 41 })],
    }),
  ])

  const result = await getMigration()

  assert.ok(result)
  assert.deepEqual(result.losses[0], {
    id: 'dayBoundary',
    subject: '曜日で絞ったルール',
    fact: '運んだ 41 件のルールで、深夜 0 時から 4 時の番組の曜日が 1 日ずれる',
  })
})

test('a record that carries no loss is left with none', async () => {
  standing([page([detail()], { losses: [] })])

  const result = await getMigration()

  assert.ok(result)
  assert.deepEqual(result.losses, [])
})

test('a record that cannot be read is raised, not passed off as no record', async () => {
  standing([page([detail()])])
  store.status = 503
  store.message = 'The migration ledger is out of reach.'

  await assert.rejects(getMigration(), {
    message: 'The migration ledger is out of reach.',
  })
  await assert.rejects(hasMigrationRecord(), {
    message: 'The migration ledger is out of reach.',
  })
})

test('この版が知らない値が記録に混じっても、画面は落ちずに日本語で閉じる', async () => {
  const later = 'somethingTheApiAddedLater'

  standing([
    page([detail({ population: later, refusal: later })], {
      populations: [population({ population: later })],
      refusals: [{ refusal: later, count: 1 }],
      losses: [loss({ subject: later })],
    }),
  ])

  const result = await getMigration()

  assert.ok(result)
  assert.equal(result.populations[0].name, NOT_YET_IN_THIS_BUILD)
  assert.equal(result.notTakenGroups[0].name, NOT_YET_IN_THIS_BUILD)
  assert.equal(result.notTakenGroups[0].reason, undefined)
  assert.equal(
    result.notTakenGroups[0].rows[0].population,
    NOT_YET_IN_THIS_BUILD,
  )
  assert.equal(result.losses[0].subject, NOT_YET_IN_THIS_BUILD)
  assert.equal(result.losses[0].fact, NOT_YET_IN_THIS_BUILD_SAYING)
  assert.doesNotMatch(result.populations[0].name, /somethingTheApiAddedLater/)
  assert.doesNotMatch(result.losses[0].fact, /somethingTheApiAddedLater/)
})
