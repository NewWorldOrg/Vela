import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

/**
 * The rules the API holds, and the query string the two sides agree the
 * conditions are written as. Only the module that reaches the network is
 * replaced; spelling the conditions, reading them back and naming the channel
 * of a preview row all run for real.
 */

interface Sent {
  method: string
  path: string
  id?: string
  body?: Record<string, unknown>
}

const sent: Sent[] = []

const store: {
  rules: unknown[]
  services: unknown[]
  answer: unknown
  status: number
  message: string
  listing: number
  listingMessage: string
} = {
  rules: [],
  services: [],
  answer: undefined,
  status: 200,
  message: '',
  listing: 200,
  listingMessage: '',
}

const answered = (status: number) => ({ status, ok: status < 400 })

interface Asking {
  params?: { path?: { id: string } }
  body?: Record<string, unknown>
}

const write = (method: string) => async (path: string, init?: Asking) => {
  sent.push({ method, path, id: init?.params?.path?.id, body: init?.body })

  const body = {
    status: store.status < 400,
    message: store.message,
    data: store.answer,
  }
  const response = answered(store.status)

  return response.ok ? { data: body, response } : { error: body, response }
}

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({
      GET: async (path: string) => {
        sent.push({ method: 'GET', path })

        if (path === '/api/services') {
          return { data: { data: store.services }, response: answered(200) }
        }

        if (store.listing >= 400) {
          return {
            error: {
              status: false,
              message: store.listingMessage,
              data: null,
            },
            response: answered(store.listing),
          }
        }

        return {
          data: {
            data: { rules: store.rules, total: store.rules.length },
            message: '',
          },
          response: answered(200),
        }
      },
      POST: write('POST'),
      PUT: write('PUT'),
      PATCH: write('PATCH'),
      DELETE: write('DELETE'),
    }),
    revalidatingCarinaClient: () => {
      throw new Error('rules do not revalidate')
    },
  },
})

import { RULE_TAKES_SHOWN } from '@/lib/rules'

const {
  applyRulesNow,
  createRule,
  deleteRule,
  impactOfRule,
  listRules,
  previewRule,
  replaceRule,
  ruleNames,
  ruleQueryOf,
  ruleTermsOf,
  switchRule,
} = await import('./rules.ts')

const service = (networkId: number, serviceId: number, name: string) => ({
  networkId,
  serviceId,
  name,
  category: 'television',
  remoteControlKeyId: null,
  selectedChannel: { system: 'isdbT' },
  candidates: [],
})

const held = (over: Record<string, unknown> = {}) => ({
  id: 'r-1',
  name: '深夜アニメを追う',
  query: 'keyword=%E6%96%B0%E7%95%AA%E7%B5%84',
  priority: 20,
  enabled: true,
  marginBeforeSeconds: 10,
  marginAfterSeconds: 30,
  createdAt: '2026-08-01T02:00:00Z',
  ...over,
})

const EVERY_CONDITION = {
  q: '新番組',
  exclude: '再放送',
  fields: 'title' as const,
  genres: ['anime' as const, 'movie' as const],
  kind: 'bs' as const,
  channels: ['4-101'],
}

const draft = (over: Record<string, unknown> = {}) => ({
  name: '深夜アニメを追う',
  terms: EVERY_CONDITION,
  priority: 20,
  enabled: true,
  marginBeforeSeconds: 10,
  marginAfterSeconds: 30,
  ...over,
})

function standing(rules: unknown[] = []): void {
  sent.length = 0
  store.rules = rules
  store.services = [
    service(131, 1310, '中央テレビ1'),
    service(4, 101, '衛星第一'),
  ]
  store.answer = held()
  store.status = 200
  store.message = ''
  store.listing = 200
  store.listingMessage = ''
}

/** What was sent to one address, whatever else the same call asked for. */
const asked = (path: string): Sent => {
  const found = sent.find((one) => one.path === path)

  if (!found) {
    throw new Error(`nothing was sent to ${path}`)
  }

  return found
}

const bodyOf = (path: string): Record<string, unknown> =>
  asked(path).body as Record<string, unknown>

test('every condition the form offers is written into the query the API holds', () => {
  assert.equal(
    ruleQueryOf(EVERY_CONDITION),
    'keyword=%E6%96%B0%E7%95%AA%E7%B5%84&exclude=%E5%86%8D%E6%94%BE%E9%80%81' +
      '&fields=Title&genre=7&genre=6&type=IsdbSBs&channel=4-101',
  )
})

test('the parts a keyword is looked for in are left out when they are the usual pair', () => {
  assert.equal(
    ruleQueryOf({ ...EVERY_CONDITION, fields: 'title,description' }),
    'keyword=%E6%96%B0%E7%95%AA%E7%B5%84&exclude=%E5%86%8D%E6%94%BE%E9%80%81' +
      '&genre=7&genre=6&type=IsdbSBs&channel=4-101',
  )
})

test('a query the API holds reads back as the conditions it was written from', () => {
  assert.deepEqual(ruleTermsOf(ruleQueryOf(EVERY_CONDITION)), {
    ...EVERY_CONDITION,
    from: undefined,
    to: undefined,
  })
})

test('the pair the query leaves unsaid reads back as the pair', () => {
  const terms = { ...EVERY_CONDITION, fields: 'title,description' as const }

  assert.deepEqual(ruleTermsOf(ruleQueryOf(terms)), {
    ...terms,
    from: undefined,
    to: undefined,
  })
})

test('a query naming only what it looks in reads back as narrowing nothing', () => {
  assert.deepEqual(ruleTermsOf('fields=Description'), {
    q: undefined,
    exclude: undefined,
    fields: 'description',
    genres: [],
    kind: undefined,
    channels: [],
    from: undefined,
    to: undefined,
  })
})

test('a value the API spells its own way is still read', () => {
  const terms = ruleTermsOf('genre=7&type=isdbt&fields=title&channel=4-101')

  assert.deepEqual(terms.genres, ['anime'])
  assert.equal(terms.kind, 'terrestrial')
  assert.equal(terms.fields, 'title')
  assert.deepEqual(terms.channels, ['4-101'])
})

test('a value the screen could not have written is left out rather than carried', () => {
  const terms = ruleTermsOf('genre=99&type=dab&channel=nowhere')

  assert.deepEqual(terms.genres, [])
  assert.equal(terms.kind, undefined)
  assert.deepEqual(terms.channels, [])
})

test('the rules the API holds arrive with their conditions read', async () => {
  standing([held(), held({ id: 'r-2', name: '映画', query: 'genre=6' })])

  const result = await listRules()

  assert.equal(result.total, 2)
  assert.equal(result.items[0].name, '深夜アニメを追う')
  assert.equal(result.items[0].terms.q, '新番組')
  assert.equal(result.items[0].priority, 20)
  assert.deepEqual(result.items[1].terms.genres, ['movie'])
})

test('each rule is named by its identifier for the reservations that carry it', async () => {
  standing([held(), held({ id: 'r-2', name: '映画をまとめて録る' })])

  const names = await ruleNames()

  assert.equal(names.get('r-1'), '深夜アニメを追う')
  assert.equal(names.get('r-2'), '映画をまとめて録る')
  assert.equal(names.get('r-3'), undefined)
})

test('a new rule is sent as its name, its query and what it books with', async () => {
  standing()

  const result = await createRule(draft())

  assert.equal(result.state, 'ok')
  assert.equal(asked('/api/rules').method, 'POST')
  assert.deepEqual(bodyOf('/api/rules'), {
    name: '深夜アニメを追う',
    query: ruleQueryOf(EVERY_CONDITION),
    priority: 20,
    enabled: true,
    marginBeforeSeconds: 10,
    marginAfterSeconds: 30,
  })
})

test('a rule that already stands is replaced whole, at its own address', async () => {
  standing()

  const result = await replaceRule('r-1', draft({ enabled: false }))

  assert.equal(result.state, 'ok')
  assert.equal(asked('/api/rules/{id}').method, 'PUT')
  assert.equal(asked('/api/rules/{id}').id, 'r-1')
  assert.equal(bodyOf('/api/rules/{id}').enabled, false)
})

test('a rule the API will not have is refused in words the screen can show', async () => {
  standing()
  store.status = 400

  const result = await createRule(draft())

  assert.equal(result.state, 'rejected')
  assert.match(
    result.state === 'rejected' ? result.message : '',
    /^ルール名と条件が、保存できる形になっていません。/,
  )
})

test('a rule that is no longer there is refused as gone', async () => {
  standing()
  store.status = 404

  const result = await replaceRule('r-1', draft())

  assert.equal(result.state, 'rejected')
  assert.match(
    result.state === 'rejected' ? result.message : '',
    /^このルールは残っていないため、保存できませんでした。$/,
  )
})

test('switching a rule off answers with how many reservations it let go', async () => {
  standing()
  store.answer = { rule: held({ enabled: false }), withdrawn: 13 }

  const result = await switchRule('r-1', false)

  assert.deepEqual(result, { state: 'ok', data: 13 })
  assert.equal(asked('/api/rules/{id}/enabled').method, 'PATCH')
  assert.deepEqual(bodyOf('/api/rules/{id}/enabled'), { enabled: false })
})

test('retiring a rule answers with what it withdrew and what it swept', async () => {
  standing()
  store.answer = { ruleId: 'r-1', withdrawn: 2, swept: 3 }

  const result = await deleteRule('r-1')

  assert.deepEqual(result, { state: 'ok', data: { withdrawn: 2, swept: 3 } })
  assert.equal(asked('/api/rules/{id}').method, 'DELETE')
})

const take = (over: Record<string, unknown> = {}) => ({
  programme: '4-101-1',
  networkId: 4,
  serviceId: 101,
  eventId: 1,
  startsAt: '2026-08-09T13:00:00Z',
  endsAt: '2026-08-09T13:30:00Z',
  name: '星のさまよいびと 第1話',
  alreadyReserved: false,
  verdict: 'secured',
  ...over,
})

const rehearsal = (takes: unknown[], over: Record<string, unknown> = {}) => ({
  takes,
  matched: takes.length,
  making: takes.length,
  alreadyReserved: 0,
  contended: 0,
  contendedAltogether: 0,
  excludedAsShadows: 0,
  seatsLeftOut: 0,
  ...over,
})

test('a rehearsal is asked about the conditions and what they would book with', async () => {
  standing()
  store.answer = rehearsal([])

  await previewRule(draft(), 'r-1')

  assert.deepEqual(bodyOf('/api/rules/preview'), {
    ruleId: 'r-1',
    query: ruleQueryOf(EVERY_CONDITION),
    priority: 20,
    marginBeforeSeconds: 10,
    marginAfterSeconds: 30,
  })
})

test('a rehearsal of a rule that does not stand yet names no rule', async () => {
  standing()
  store.answer = rehearsal([])

  await previewRule(draft())

  assert.equal(bodyOf('/api/rules/preview').ruleId, undefined)
})

test('a preview row is named by its channel and the span it covers', async () => {
  standing()
  store.answer = rehearsal([take()], { alreadyReserved: 1, contended: 1 })

  const result = await previewRule(draft())

  assert.equal(result.state, 'ok')

  const preview = result.state === 'ok' ? result.data : undefined

  assert.equal(preview?.takes[0].channelName, '衛星第一')
  assert.equal(preview?.takes[0].whenLabel, '08/09(日) 22:00–22:30')
  assert.equal(preview?.takes[0].title, '星のさまよいびと 第1話')
  assert.equal(preview?.takes[0].verdict, 'secured')
  assert.equal(preview?.alreadyReserved, 1)
  assert.equal(preview?.contended, 1)
})

test('a programme with no end announced says so rather than inventing one', async () => {
  standing()
  store.answer = rehearsal([take({ endsAt: null })])

  const result = await previewRule(draft())
  const preview = result.state === 'ok' ? result.data : undefined

  assert.equal(preview?.takes[0].whenLabel, '08/09(日) 22:00–終了未定')
})

test('a channel the services do not name falls back to the pair that names it', async () => {
  standing()
  store.services = []
  store.answer = rehearsal([take()])

  const result = await previewRule(draft())
  const preview = result.state === 'ok' ? result.data : undefined

  assert.equal(preview?.takes[0].channelName, '4-101')
})

test('the rows are cut to what a screen shows, and the count is not cut with them', async () => {
  standing()

  const many = Array.from({ length: RULE_TAKES_SHOWN + 5 }, (_, index) =>
    take({
      programme: `4-101-${index}`,
      eventId: index,
      startsAt: new Date(
        Date.parse('2026-08-09T13:00:00Z') + index * 3_600_000,
      ).toISOString(),
      endsAt: new Date(
        Date.parse('2026-08-09T13:30:00Z') + index * 3_600_000,
      ).toISOString(),
    }),
  )

  store.answer = rehearsal(many)

  const result = await previewRule(draft())
  const preview = result.state === 'ok' ? result.data : undefined

  assert.equal(preview?.takes.length, RULE_TAKES_SHOWN)
  assert.equal(preview?.matched, RULE_TAKES_SHOWN + 5)
  assert.equal(preview?.takes[0].id, '4-101-0')
})

test('the rows are ordered by when the broadcast starts, whatever order they arrived in', async () => {
  standing()
  store.answer = rehearsal([
    take({
      programme: 'late',
      startsAt: '2026-08-10T13:00:00Z',
      endsAt: '2026-08-10T13:30:00Z',
    }),
    take({ programme: 'early' }),
  ])

  const result = await previewRule(draft())
  const preview = result.state === 'ok' ? result.data : undefined

  assert.deepEqual(
    preview?.takes.map((one) => one.id),
    ['early', 'late'],
  )
})

test('a rehearsal the tuners cannot be counted for is refused, not left empty', async () => {
  standing()
  store.status = 503

  const result = await previewRule(draft())

  assert.equal(result.state, 'rejected')
  assert.match(
    result.state === 'rejected' ? result.message : '',
    /チューナーの空きを数えられない/,
  )
})

test('what saving would change is counted from the same draft', async () => {
  standing()
  store.answer = {
    making: 2,
    withdrawing: 1,
    sweeping: 5,
    changingHands: 3,
    excludedAsShadows: 4,
  }

  const result = await impactOfRule(draft(), 'r-1')

  assert.equal(asked('/api/rules/impact').method, 'POST')
  assert.deepEqual(result, {
    state: 'ok',
    data: {
      making: 2,
      withdrawing: 1,
      sweeping: 5,
      changingHands: 3,
      excluded: 4,
    },
  })
})

/**
 * Saving and deleting are counted on different terms and answered as two
 * numbers. Reading one where the other belongs is what said nothing would be
 * left while several were, so each is pinned to the field it comes from.
 */
test('what deleting would leave is counted apart from what saving would', async () => {
  standing()
  store.answer = {
    making: 0,
    withdrawing: 0,
    sweeping: 3,
    changingHands: 0,
    excludedAsShadows: 0,
  }

  const result = await impactOfRule(draft(), 'r-1')
  const impact = result.state === 'ok' ? result.data : undefined

  assert.equal(impact?.withdrawing, 0)
  assert.equal(impact?.sweeping, 3)
})

test('a count the API spells as a string still reads as a number', async () => {
  standing()
  store.answer = {
    making: '0',
    withdrawing: '1',
    sweeping: '7',
    changingHands: '0',
    excludedAsShadows: '0',
  }

  const result = await impactOfRule(draft(), 'r-1')

  assert.equal(result.state === 'ok' ? result.data.sweeping : undefined, 7)
})

test('an application answers with what the pass read and settled', async () => {
  standing()
  store.answer = {
    applyId: 'a-1',
    revision: 31596,
    read: 10015,
    made: 3,
    refused: 1,
    withdrawn: 2,
    turnedOff: 0,
    faulted: 0,
  }

  const result = await applyRulesNow('r-1')

  assert.equal(asked('/api/rules/{id}/apply-now').id, 'r-1')
  assert.deepEqual(result, {
    state: 'ok',
    data: {
      read: 10015,
      made: 3,
      refused: 1,
      withdrawn: 2,
      turnedOff: 0,
      faulted: 0,
    },
  })
})

test('an application asked for too soon says when it may be asked for again', async () => {
  standing()
  store.status = 409
  store.answer = {
    refusal: 'tooSoonAfterTheLastOne',
    runningApplyId: null,
    notBefore: '2026-08-09T13:05:00Z',
  }

  const result = await applyRulesNow('r-1')

  assert.equal(result.state, 'rejected')
  assert.match(
    result.state === 'rejected' ? result.message : '',
    /08\/09\(日\) 22:05 以降に/,
  )
})

test('an application refused because one is walking says that instead', async () => {
  standing()
  store.status = 409
  store.answer = {
    refusal: 'oneIsAlreadyRunning',
    runningApplyId: 'a-1',
    notBefore: null,
  }

  const result = await applyRulesNow('r-1')

  assert.equal(result.state, 'rejected')
  assert.match(
    result.state === 'rejected' ? result.message : '',
    /すでに走っている/,
  )
})

test('rules that cannot be read throw what the API said about them', async () => {
  standing()
  store.listing = 503
  store.listingMessage = 'The rule ledger is out of reach.'

  await assert.rejects(() => listRules(), /The rule ledger is out of reach\./)

  store.listingMessage = ''
  await assert.rejects(() => listRules(), /ルールを読めませんでした/)
})
