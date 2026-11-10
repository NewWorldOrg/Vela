import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { beforeEach, mock, test } from 'node:test'

const NAVIGATION = 'next/navigation'

const STOOD_IN = 'vela-stand-in:next/navigation'

registerHooks({
  resolve(specifier, context, next) {
    return specifier === NAVIGATION
      ? { url: STOOD_IN, shortCircuit: true }
      : next(specifier, context)
  },
  load(url, context, next) {
    return url === STOOD_IN
      ? {
          format: 'module',
          source: 'export const unstable_rethrow = () => {}',
          shortCircuit: true,
        }
      : next(url, context)
  },
})

interface Sent {
  method: string
  path: string
  at?: Record<string, unknown>
  query?: Record<string, unknown>
  body?: Record<string, unknown>
}

interface Asked {
  params?: {
    path?: Record<string, unknown>
    query?: Record<string, unknown>
  }
  body?: Record<string, unknown>
}

const HOME = '0a000000-0000-4000-8000-000000000001'

const GAMES = '0a000000-0000-4000-8000-000000000002'

const FAILURES = '0b000000-0000-4000-8000-000000000001'

const DESTINATION_HOME = {
  id: HOME,
  name: '見本の送り先 1',
  kind: 'slack',
  tail: 'a1b2',
  enabled: true,
  readable: true,
  lastResultAt: '2026-01-02T03:04:05Z',
  lastFailure: null,
  createdAt: '2026-01-01T00:00:00Z',
  changedAt: '2026-01-01T00:00:00Z',
}

const DESTINATION_GAMES = {
  ...DESTINATION_HOME,
  id: GAMES,
  name: '見本の送り先 2',
  kind: 'discord',
  tail: '9f3e',
  enabled: false,
  readable: false,
  lastFailure: 'timedOut',
}

const RULE = {
  id: FAILURES,
  name: '見本のルールセット',
  enabled: true,
  events: ['recordingFailed', 'encodeFailed'],
  destinations: [HOME],
  createdAt: '2026-01-01T00:00:00Z',
  changedAt: '2026-01-01T00:00:00Z',
}

function delivery(id: string, occurredAt: string, more: object = {}) {
  return {
    id,
    kind: 'recordingFailed',
    title: '見本の見出し',
    occurredAt,
    state: 'sent',
    attempts: 1,
    queuedAt: occurredAt,
    sentAt: occurredAt,
    nextAttemptAt: null,
    failure: null,
    ...more,
  }
}

const DOCUMENTARY = '32736-1024-501'

const PROGRAMME = {
  id: DOCUMENTARY,
  networkId: 32736,
  serviceId: 1024,
  eventId: 501,
  startsAt: '2030-01-02T12:00:00Z',
  endsAt: '2030-01-02T12:50:00Z',
  name: '見本の番組 1',
  summary: '',
  isShadow: false,
  hasSubtitles: false,
  audio: 'stereo',
  sounds: 1,
  video: 'hd',
  aspect: 'wide',
  isArchived: false,
}

const BEFORE_IT_STARTS = Date.parse('2030-01-02T11:00:00Z')

const AFTER_IT_STARTED = Date.parse('2030-01-02T12:00:00Z')

function watch(id: string, more: object = {}) {
  return {
    id,
    programmeId: DOCUMENTARY,
    networkId: 32736,
    serviceId: 1024,
    eventId: 501,
    startsAt: '2030-01-02T12:00:00Z',
    endsAt: '2030-01-02T12:50:00Z',
    programmeName: '見本の番組 1',
    stationName: '見本テレビ',
    leadMinutes: 3,
    destinations: [HOME],
    state: 'waiting',
    notifiedAt: null,
    createdAt: '2030-01-01T00:00:00Z',
    changedAt: '2030-01-01T00:00:00Z',
    ...more,
  }
}

const WATCH_ONE = '0c000000-0000-4000-8000-000000000001'

const WATCH_TWO = '0c000000-0000-4000-8000-000000000002'

const sent: Sent[] = []

const store: {
  destinations: unknown[]
  rules: unknown[]
  settings: unknown
  deliveries: Record<string, unknown[]>
  trial: unknown
  watches: unknown[]
  programme: unknown
  made: unknown
  readStatus: number
  readMessage: string
  writeStatus: number
  writeMessage: string
  down: 'nothing' | 'writes' | 'everything'
  unread: string
} = {
  destinations: [],
  rules: [],
  settings: null,
  deliveries: {},
  trial: null,
  watches: [],
  programme: null,
  made: null,
  readStatus: 200,
  readMessage: '',
  writeStatus: 200,
  writeMessage: '',
  down: 'nothing',
  unread: '',
}

const NOT_THERE = 'the API is not there'

const answered = (status: number) => ({ status, ok: status < 400 })

const envelope = (data: unknown) => ({
  data: { status: true, message: '', data },
  response: answered(200),
})

const refusal = (status: number, message: string) => ({
  error: { status: false, message, data: null },
  response: answered(status),
})

function written(data: unknown = null) {
  return store.writeStatus < 400
    ? {
        data: { status: true, message: '', data },
        response: answered(store.writeStatus),
      }
    : refusal(store.writeStatus, store.writeMessage)
}

function wrote(method: string) {
  return async (path: string, options?: Asked) => {
    sent.push({
      method,
      path,
      at: options?.params?.path,
      body: options?.body,
    })

    if (store.down !== 'nothing') {
      throw new Error(NOT_THERE)
    }

    return written(answerTo(method, path))
  }
}

function answerTo(method: string, path: string): unknown {
  if (path.endsWith('/test')) {
    return store.trial
  }

  return method === 'POST' && path === '/api/notifications/watches'
    ? store.made
    : null
}

const client = () => ({
  GET: async (path: string, options?: Asked) => {
    const query = options?.params?.query
    sent.push({ method: 'GET', path, query })

    if (store.down === 'everything') {
      throw new Error(NOT_THERE)
    }

    if (store.unread === path) {
      return refusal(503, '')
    }

    if (store.readStatus >= 400) {
      return refusal(store.readStatus, store.readMessage)
    }

    switch (path) {
      case '/api/notifications/destinations':
        return envelope({ items: store.destinations })
      case '/api/notifications/rules':
        return envelope({ items: store.rules })
      case '/api/notifications/settings':
        return envelope(store.settings)
      case '/api/notifications/deliveries':
        return envelope({
          perPage: query?.perPage,
          items: store.deliveries[String(query?.destinationId)] ?? [],
        })
      case '/api/notifications/watches':
        return envelope({ items: store.watches })
      case '/api/programs/{id}':
        return store.programme
          ? envelope(store.programme)
          : { data: undefined, response: answered(404) }
      default:
        throw new Error(`unexpected GET ${path}`)
    }
  },
  POST: wrote('POST'),
  PUT: wrote('PUT'),
  PATCH: wrote('PATCH'),
  DELETE: wrote('DELETE'),
})

mock.module('@/repository/client/carina', {
  namedExports: { carinaClient: client, revalidatingCarinaClient: client },
})

const {
  WHEN_ADDING_A_DESTINATION,
  WHEN_ADDING_A_RULE_SET,
  WHEN_CHANGING_A_DESTINATION,
  WHEN_CHANGING_A_RULE_SET,
  WHEN_TRYING_A_DESTINATION,
  askForWatch,
  cancelWatch,
  defineRuleSet,
  getNotificationsScreen,
  getWatchOffer,
  listWatchedProgrammes,
  listWatches,
  readSingleNotices,
  registerDestination,
  removeDestination,
  removeRuleSet,
  reviseDestination,
  reviseRuleSet,
  settleLead,
  switchDestination,
  switchRuleSet,
  tryDestination,
  whyItRefused,
} = await import('@/repository/notifications')

beforeEach(() => {
  sent.length = 0
  store.destinations = [DESTINATION_HOME, DESTINATION_GAMES]
  store.rules = [RULE]
  store.settings = { notifyLeadMinutes: 3, publicOriginKnown: true }
  store.deliveries = {}
  store.trial = { delivered: true, failure: null }
  store.watches = []
  store.programme = PROGRAMME
  store.made = watch(WATCH_ONE)
  store.readStatus = 200
  store.readMessage = ''
  store.writeStatus = 200
  store.writeMessage = ''
  store.down = 'nothing'
  store.unread = ''
})

test('the screen is read from the destinations, the rule sets and the settings', async () => {
  const screen = await getNotificationsScreen()

  assert.deepEqual(screen.destinations, [
    {
      id: HOME,
      name: '見本の送り先 1',
      kind: 'slack',
      tail: 'a1b2',
      enabled: true,
      readable: true,
      lastResultAt: '2026-01-02T03:04:05Z',
      lastFailure: undefined,
    },
    {
      id: GAMES,
      name: '見本の送り先 2',
      kind: 'discord',
      tail: '9f3e',
      enabled: false,
      readable: false,
      lastResultAt: '2026-01-02T03:04:05Z',
      lastFailure: 'timedOut',
    },
  ])
  assert.deepEqual(screen.ruleSets, [
    {
      id: FAILURES,
      name: '見本のルールセット',
      enabled: true,
      events: ['recordingFailed', 'encodeFailed'],
      destinations: [HOME],
    },
  ])
  assert.deepEqual(screen.settings, {
    notifyLeadMinutes: 3,
    publicOriginKnown: true,
  })
})

test('a destination that has sent nothing yet has no last result', async () => {
  store.destinations = [{ ...DESTINATION_HOME, lastResultAt: null }]

  const screen = await getNotificationsScreen()

  assert.equal(screen.destinations[0].lastResultAt, undefined)
})

test('the lead arrives as a number even when the API writes it as text', async () => {
  store.settings = { notifyLeadMinutes: '10', publicOriginKnown: false }

  const screen = await getNotificationsScreen()

  assert.deepEqual(screen.settings, {
    notifyLeadMinutes: 10,
    publicOriginKnown: false,
  })
})

test('a lead the screen cannot offer is not shown as another one', async () => {
  store.settings = { notifyLeadMinutes: 15, publicOriginKnown: true }

  await assert.rejects(getNotificationsScreen(), /通知の設定を読めませんでした/)
})

test('the deliveries of every destination are asked for, fifty each', async () => {
  await getNotificationsScreen()

  assert.deepEqual(
    sent
      .filter((one) => one.path === '/api/notifications/deliveries')
      .map((one) => one.query),
    [
      { destinationId: HOME, perPage: 50 },
      { destinationId: GAMES, perPage: 50 },
    ],
  )
})

test('the deliveries come as one list, the newest first, each with the destination it went to', async () => {
  store.deliveries = {
    [HOME]: [
      delivery('d-1', '2026-01-02T10:00:00Z'),
      delivery('d-3', '2026-01-02T08:00:00Z'),
    ],
    [GAMES]: [
      delivery('d-2', '2026-01-02T09:00:00Z', {
        kind: 'encodeFailed',
        state: 'givenUp',
        failure: 'rejected',
      }),
    ],
  }

  const screen = await getNotificationsScreen()

  assert.deepEqual(screen.deliveries, [
    {
      id: 'd-1',
      kind: 'recordingFailed',
      occurredAt: '2026-01-02T10:00:00Z',
      destinationId: HOME,
      state: 'sent',
      failure: undefined,
    },
    {
      id: 'd-2',
      kind: 'encodeFailed',
      occurredAt: '2026-01-02T09:00:00Z',
      destinationId: GAMES,
      state: 'givenUp',
      failure: 'rejected',
    },
    {
      id: 'd-3',
      kind: 'recordingFailed',
      occurredAt: '2026-01-02T08:00:00Z',
      destinationId: HOME,
      state: 'sent',
      failure: undefined,
    },
  ])
})

test('with no destination, no delivery is asked for', async () => {
  store.destinations = []
  store.rules = []

  const screen = await getNotificationsScreen()

  assert.deepEqual(screen.deliveries, [])
  assert.equal(
    sent.some((one) => one.path === '/api/notifications/deliveries'),
    false,
  )
})

test('a screen that cannot be read says so', async () => {
  store.readStatus = 500

  await assert.rejects(getNotificationsScreen(), /通知の設定を読めませんでした/)
})

test('a destination is registered by its name and its address', async () => {
  store.writeStatus = 201

  const result = await registerDestination({
    name: '見本の送り先 3',
    url: 'https://webhook.example/one',
  })

  assert.deepEqual(result, { state: 'ok' })
  assert.deepEqual(sent, [
    {
      method: 'POST',
      path: '/api/notifications/destinations',
      at: undefined,
      body: { name: '見本の送り先 3', url: 'https://webhook.example/one' },
    },
  ])
})

test('a change that leaves the address empty sends it empty, so the address stays', async () => {
  await reviseDestination(HOME, { name: '見本の送り先 1', enabled: false })

  assert.deepEqual(sent, [
    {
      method: 'PATCH',
      path: '/api/notifications/destinations/{id}',
      at: { id: HOME },
      body: { name: '見本の送り先 1', enabled: false, url: '' },
    },
  ])
})

test('a change that writes the address anew sends it', async () => {
  await reviseDestination(HOME, {
    name: '見本の送り先 1',
    enabled: true,
    url: 'https://webhook.example/two',
  })

  assert.deepEqual(sent[0].body, {
    name: '見本の送り先 1',
    enabled: true,
    url: 'https://webhook.example/two',
  })
})

test('the switch of a destination sends the switch alone', async () => {
  await switchDestination(GAMES, true)

  assert.deepEqual(sent, [
    {
      method: 'PATCH',
      path: '/api/notifications/destinations/{id}',
      at: { id: GAMES },
      body: { enabled: true },
    },
  ])
})

test('a destination is removed by its id', async () => {
  const result = await removeDestination(HOME)

  assert.deepEqual(result, { state: 'ok' })
  assert.deepEqual(sent, [
    {
      method: 'DELETE',
      path: '/api/notifications/destinations/{id}',
      at: { id: HOME },
      body: undefined,
    },
  ])
})

test('a trial that arrived says so', async () => {
  const result = await tryDestination(HOME)

  assert.deepEqual(result, {
    state: 'ok',
    delivered: true,
    failure: undefined,
  })
  assert.deepEqual(sent, [
    {
      method: 'POST',
      path: '/api/notifications/destinations/{id}/test',
      at: { id: HOME },
      body: undefined,
    },
  ])
})

test('a trial that did not arrive carries why', async () => {
  store.trial = { delivered: false, failure: 'unreachable' }

  assert.deepEqual(await tryDestination(HOME), {
    state: 'ok',
    delivered: false,
    failure: 'unreachable',
  })
})

test('a trial sent too soon after another is refused in words a reader can act on', async () => {
  store.writeStatus = 429
  store.writeMessage =
    'A trial was sent a moment ago. One destination is tried once a minute, and five trials are sent a minute in all.'

  assert.deepEqual(await tryDestination(HOME), {
    state: 'rejected',
    message: '続けてテスト送信はできません。1 分ほどおいてからお試しください。',
  })
})

test('a trial to a destination whose address cannot be opened says to write it again', async () => {
  store.writeStatus = 409
  store.writeMessage =
    'The address of this destination cannot be opened with the keys this server holds. Write the address again to send to it.'

  assert.deepEqual(await tryDestination(HOME), {
    state: 'rejected',
    message: 'この送り先の URL を開けません。URL を入れ直してください。',
  })
})

test('a rule set is made of its name, its switch, its events and its destinations', async () => {
  store.writeStatus = 201

  const result = await defineRuleSet({
    name: '見本のルールセット 2',
    enabled: true,
    events: ['recordingCompleted'],
    destinations: [HOME, GAMES],
  })

  assert.deepEqual(result, { state: 'ok' })
  assert.deepEqual(sent, [
    {
      method: 'POST',
      path: '/api/notifications/rules',
      at: undefined,
      body: {
        name: '見本のルールセット 2',
        enabled: true,
        events: ['recordingCompleted'],
        destinations: [HOME, GAMES],
      },
    },
  ])
})

test('a rule set is changed, switched and removed by its id', async () => {
  await reviseRuleSet(FAILURES, {
    name: '見本のルールセット',
    enabled: true,
    events: [],
    destinations: [GAMES],
  })
  await switchRuleSet(FAILURES, false)
  await removeRuleSet(FAILURES)

  assert.deepEqual(sent, [
    {
      method: 'PATCH',
      path: '/api/notifications/rules/{id}',
      at: { id: FAILURES },
      body: {
        name: '見本のルールセット',
        enabled: true,
        events: [],
        destinations: [GAMES],
      },
    },
    {
      method: 'PATCH',
      path: '/api/notifications/rules/{id}',
      at: { id: FAILURES },
      body: { enabled: false },
    },
    {
      method: 'DELETE',
      path: '/api/notifications/rules/{id}',
      at: { id: FAILURES },
      body: undefined,
    },
  ])
})

test('the lead is put as the minutes chosen', async () => {
  const result = await settleLead(5)

  assert.deepEqual(result, { state: 'ok' })
  assert.deepEqual(sent, [
    {
      method: 'PUT',
      path: '/api/notifications/settings',
      at: undefined,
      body: { notifyLeadMinutes: 5 },
    },
  ])
})

test('a write from someone signed out says so, whatever was being written', async () => {
  store.writeStatus = 401

  assert.deepEqual(await registerDestination({ name: 'n', url: 'u' }), {
    state: 'unauthenticated',
  })
  assert.deepEqual(await tryDestination(HOME), { state: 'unauthenticated' })
  assert.deepEqual(await settleLead(0), { state: 'unauthenticated' })
})

test('an address Carina will not send to is refused in the words the form uses', async () => {
  store.writeStatus = 400
  store.writeMessage =
    'The address is not one a notice can be sent to: an https webhook of Slack or of Discord. It is not repeated here.'

  assert.deepEqual(await registerDestination({ name: 'n', url: 'u' }), {
    state: 'rejected',
    message: 'この URL は受け付けられません。',
  })
})

test('the twenty-first rule set is refused with the number that are held', async () => {
  store.writeStatus = 409
  store.writeMessage =
    'At most 20 sets of rules are held. Remove one to make another.'

  assert.deepEqual(
    await defineRuleSet({
      name: 'n',
      enabled: true,
      events: [],
      destinations: [HOME],
    }),
    {
      state: 'rejected',
      message: 'ルールセットは 20 本までのため、追加できませんでした。',
    },
  )
})

test('what Carina says about a refusal is put in the words of the screen', () => {
  assert.equal(
    whyItRefused(
      WHEN_CHANGING_A_DESTINATION,
      'No destination is registered under that id.',
    ),
    'この送り先は残っていないため、変更できませんでした。',
  )
  assert.equal(
    whyItRefused(
      WHEN_TRYING_A_DESTINATION,
      'No destination is registered under that id.',
    ),
    'この送り先は残っていないため、テスト送信できませんでした。',
  )
  assert.equal(
    whyItRefused(
      WHEN_CHANGING_A_RULE_SET,
      'No set of rules is held under that id.',
    ),
    'このルールセットは残っていないため、変更できませんでした。',
  )
  assert.equal(
    whyItRefused(
      WHEN_ADDING_A_RULE_SET,
      'A set of rules sends to at least one destination, each of them registered.',
    ),
    '選んだ送り先が残っていないため、追加できませんでした。',
  )
  assert.equal(
    whyItRefused(
      WHEN_ADDING_A_DESTINATION,
      'A destination is named in one to sixty-four characters, none of them a control character.',
    ),
    '名前が 1 〜 64 文字でないため、追加できませんでした。',
  )
  assert.equal(
    whyItRefused(WHEN_ADDING_A_DESTINATION, undefined),
    '送り先を追加できませんでした。時間をおいてからもう一度お試しください。',
  )
  assert.equal(
    whyItRefused(
      WHEN_ADDING_A_DESTINATION,
      'Something this build never heard.',
    ),
    '送り先を追加できませんでした。時間をおいてからもう一度お試しください。',
  )
})

test('the programmes whose start is to be told are the single notices still waiting', async () => {
  store.watches = [
    watch(WATCH_ONE, { leadMinutes: '5' }),
    watch(WATCH_TWO, { programmeId: '32736-1024-502', state: 'notified' }),
    watch(GAMES, { programmeId: '32736-1024-503', state: 'skipped' }),
    watch(HOME, { programmeId: '32736-1024-504', state: 'cancelled' }),
  ]

  assert.deepEqual(
    [...(await listWatches())],
    [[DOCUMENTARY, { id: WATCH_ONE, leadMinutes: 5 }]],
  )
})

test('single notices that cannot be read are an error, not an empty answer', async () => {
  store.readStatus = 500
  store.readMessage = 'boom'

  await assert.rejects(listWatches(), /boom/)
  await assert.rejects(listWatchedProgrammes(), /boom/)
  await assert.rejects(getWatchOffer(), /boom/)
})

test('a new single notice starts from the lead the settings hold and the destinations that are on', async () => {
  assert.deepEqual(await getWatchOffer(), {
    leadMinutes: 3,
    destinations: [{ id: HOME, name: '見本の送り先 1' }],
  })
})

test('nothing is offered while no destination is on', async () => {
  store.destinations = [DESTINATION_GAMES]

  assert.equal(await getWatchOffer(), undefined)
})

test('the waiting notices are listed with the names of the destinations that are still there', async () => {
  store.watches = [
    watch(WATCH_ONE, { destinations: [HOME, GAMES, FAILURES] }),
    watch(WATCH_TWO, {
      programmeId: '32736-1024-502',
      stationName: null,
      state: 'notified',
    }),
  ]

  assert.deepEqual(await listWatchedProgrammes(), [
    {
      id: WATCH_ONE,
      leadMinutes: 3,
      title: '見本の番組 1',
      channelName: '見本テレビ',
      startAt: '2030-01-02T12:00:00Z',
      endAt: '2030-01-02T12:50:00Z',
      destinationNames: ['見本の送り先 1', '見本の送り先 2'],
    },
  ])
})

test('a single notice is asked for with the programme, its start, the lead and the destinations', async () => {
  store.writeStatus = 201

  assert.deepEqual(
    await askForWatch(
      DOCUMENTARY,
      { leadMinutes: 3, destinations: [HOME] },
      BEFORE_IT_STARTS,
    ),
    { state: 'ok', watch: { id: WATCH_ONE, leadMinutes: 3 } },
  )
  assert.deepEqual(sent.at(-1), {
    method: 'POST',
    path: '/api/notifications/watches',
    at: undefined,
    body: {
      programme: DOCUMENTARY,
      programmeStartsAt: '2030-01-02T12:00:00Z',
      leadMinutes: 3,
      destinations: [HOME],
    },
  })
})

test('a single notice for a programme the guide no longer has is refused before asking', async () => {
  store.programme = null

  assert.deepEqual(
    await askForWatch(DOCUMENTARY, { leadMinutes: 3, destinations: [HOME] }),
    {
      state: 'rejected',
      message:
        'この番組は番組表にもうないため、通知を設定できませんでした。番組表を読み直してください。',
    },
  )
  assert.ok(!sent.some(({ method }) => method === 'POST'))
})

test('what refuses a single notice is said by its status and the time, never in the words Carina used', async () => {
  const asked = (now: number) =>
    askForWatch(DOCUMENTARY, { leadMinutes: 3, destinations: [HOME] }, now)

  store.writeMessage = 'The programme has already started.'

  store.writeStatus = 404
  assert.deepEqual(await asked(BEFORE_IT_STARTS), {
    state: 'rejected',
    message:
      'この番組は番組表にもうないため、通知を設定できませんでした。番組表を読み直してください。',
  })

  store.writeStatus = 400
  assert.deepEqual(await asked(BEFORE_IT_STARTS), {
    state: 'rejected',
    message:
      '選んだ送り先が使えなくなったため、通知を設定できませんでした。画面を読み直してください。',
  })

  store.writeStatus = 409
  assert.deepEqual(await asked(AFTER_IT_STARTED), {
    state: 'rejected',
    message: 'この番組はもう始まっているため、通知を設定できませんでした。',
  })
  assert.deepEqual(await asked(BEFORE_IT_STARTS), {
    state: 'rejected',
    message:
      'この番組の通知はすでに設定してあるか、もう送ったため、設定できませんでした。',
  })

  store.writeStatus = 500
  assert.deepEqual(await asked(BEFORE_IT_STARTS), {
    state: 'rejected',
    message:
      '通知を設定できませんでした。時間をおいてからもう一度お試しください。',
  })

  store.writeStatus = 401
  assert.deepEqual(await asked(BEFORE_IT_STARTS), { state: 'unauthenticated' })
})

test('a single notice Carina took without saying which is not counted as set', async () => {
  store.writeStatus = 201
  store.made = null

  assert.deepEqual(
    await askForWatch(
      DOCUMENTARY,
      { leadMinutes: 3, destinations: [HOME] },
      BEFORE_IT_STARTS,
    ),
    {
      state: 'rejected',
      message:
        '通知を設定できませんでした。時間をおいてからもう一度お試しください。',
    },
  )
})

test('a single notice is taken back by its id', async () => {
  assert.deepEqual(await cancelWatch(WATCH_ONE), { state: 'ok' })
  assert.deepEqual(sent.at(-1), {
    method: 'DELETE',
    path: '/api/notifications/watches/{id}',
    at: { id: WATCH_ONE },
    body: undefined,
  })
})

test('what refuses taking a single notice back is said by its status', async () => {
  store.writeStatus = 404
  assert.deepEqual(await cancelWatch(WATCH_ONE), {
    state: 'rejected',
    message: 'この通知は残っていないため、取り消せませんでした。',
  })

  store.writeStatus = 409
  assert.deepEqual(await cancelWatch(WATCH_ONE), {
    state: 'rejected',
    message: 'この通知はもう済んでいるため、取り消せませんでした。',
  })

  store.writeStatus = 503
  assert.deepEqual(await cancelWatch(WATCH_ONE), {
    state: 'rejected',
    message:
      '通知を取り消せませんでした。時間をおいてからもう一度お試しください。',
  })

  store.writeStatus = 401
  assert.deepEqual(await cancelWatch(WATCH_ONE), { state: 'unauthenticated' })
})

test('a write that never reached Carina is refused in the words of what was asked, never thrown', async () => {
  store.down = 'everything'

  const later = '時間をおいてからもう一度お試しください。'
  const refused = (what: string) => ({
    state: 'rejected',
    message: `${what}。${later}`,
    unreached: true,
  })
  const rule = {
    name: '見本のルールセット',
    enabled: true,
    events: ['recordingFailed' as const],
    destinations: [HOME],
  }

  assert.deepEqual(
    await registerDestination({ name: 'n', url: 'u' }),
    refused('送り先を追加できませんでした'),
  )
  assert.deepEqual(
    await reviseDestination(HOME, { name: 'n', enabled: true }),
    refused('送り先を変更できませんでした'),
  )
  assert.deepEqual(
    await switchDestination(HOME, false),
    refused('送り先を変更できませんでした'),
  )
  assert.deepEqual(
    await removeDestination(HOME),
    refused('送り先を削除できませんでした'),
  )
  assert.deepEqual(
    await tryDestination(HOME),
    refused('テスト送信ができませんでした'),
  )
  assert.deepEqual(
    await defineRuleSet(rule),
    refused('ルールセットを追加できませんでした'),
  )
  assert.deepEqual(
    await reviseRuleSet(FAILURES, rule),
    refused('ルールセットを変更できませんでした'),
  )
  assert.deepEqual(
    await switchRuleSet(FAILURES, false),
    refused('ルールセットを変更できませんでした'),
  )
  assert.deepEqual(
    await removeRuleSet(FAILURES),
    refused('ルールセットを削除できませんでした'),
  )
  assert.deepEqual(
    await settleLead(0),
    refused('単発の通知の既定を変更できませんでした'),
  )
  assert.deepEqual(
    await askForWatch(DOCUMENTARY, { leadMinutes: 3, destinations: [HOME] }),
    refused('通知を設定できませんでした'),
  )
  assert.deepEqual(
    await cancelWatch(WATCH_ONE),
    refused('通知を取り消せませんでした'),
  )
})

test('a single notice whose asking never arrived is refused the same way, the programme having been read', async () => {
  store.down = 'writes'

  assert.deepEqual(
    await askForWatch(
      DOCUMENTARY,
      { leadMinutes: 3, destinations: [HOME] },
      BEFORE_IT_STARTS,
    ),
    {
      state: 'rejected',
      message:
        '通知を設定できませんでした。時間をおいてからもう一度お試しください。',
      unreached: true,
    },
  )
  assert.equal(sent.at(-1)?.method, 'POST')
})

test('what is read stays an error while Carina is not there', async () => {
  store.down = 'everything'

  await assert.rejects(getNotificationsScreen(), /the API is not there/)
  await assert.rejects(listWatches(), /the API is not there/)
  await assert.rejects(getWatchOffer(), /the API is not there/)
  await assert.rejects(listWatchedProgrammes(), /the API is not there/)
})

test('the single notices are read as those waiting and what a new one starts from', async () => {
  store.watches = [watch(WATCH_ONE)]

  const { watches, offer } = readSingleNotices()

  assert.deepEqual([...(await watches).keys()], [DOCUMENTARY])
  assert.deepEqual(await offer, {
    leadMinutes: 3,
    destinations: [{ id: HOME, name: '見本の送り先 1' }],
  })
})

test('while the notices waiting cannot be read none is marked, and no new one is offered, since one may already be set', async () => {
  store.watches = [watch(WATCH_ONE)]
  store.unread = '/api/notifications/watches'

  const { watches, offer } = readSingleNotices()

  assert.equal((await watches).size, 0)
  assert.equal(await offer, undefined)
})

test('while what a new one starts from cannot be read, the notices waiting are still marked', async () => {
  store.watches = [watch(WATCH_ONE)]
  store.unread = '/api/notifications/settings'

  const { watches, offer } = readSingleNotices()

  assert.deepEqual([...(await watches).keys()], [DOCUMENTARY])
  assert.equal(await offer, undefined)
})
