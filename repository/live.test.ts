import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

/**
 * The live screen's reading, with the API standing in for itself. Only the
 * module that reaches the network is replaced; reading the channels, sorting
 * out which kind each is, and finding what is on air all run for real.
 */

interface Sent {
  path: string
  query?: Record<string, unknown>
}

const sent: Sent[] = []

const store: {
  channels: unknown[]
  profiles: unknown[]
  programmes: unknown[]
  tuners?: unknown[]
} = { channels: [], profiles: [], programmes: [], tuners: [] }

const answering = (data: unknown) => ({
  data: { status: true, message: '', data },
  error: undefined,
  response: { status: 200, ok: true },
})

const GET = async (
  path: string,
  init?: { params?: { query?: Record<string, unknown> } },
) => {
  sent.push({ path, query: init?.params?.query })

  switch (path) {
    case '/api/live/channels':
      return answering({
        items: store.channels,
        total: store.channels.length,
        currentPage: 1,
        lastPage: 1,
        perPage: 200,
      })
    case '/api/live/profiles':
      return answering(store.profiles)
    case '/api/tuners':
      if (!store.tuners) {
        throw new Error('the tuner ledger is not answering')
      }

      return answering({ desired: store.tuners, observed: [], drifted: false })
    case '/api/programs':
      return answering({ programmes: store.programmes })
    default:
      throw new Error(`nothing answers ${path}`)
  }
}

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({ GET }),
    revalidatingCarinaClient: () => ({ GET }),
  },
})

const { getLiveScreen, nowNextOf, watchingOf } = await import('./live.ts')

const NOW = new Date('2026-08-08T12:04:00Z')

function listed(
  networkId: number,
  serviceId: number,
  name: string,
  over: Record<string, unknown> = {},
) {
  return {
    networkId,
    serviceId,
    name,
    category: 'television',
    remoteControlKeyId: 1,
    viewers: 0,
    tuning: { system: 'isdbT', physicalChannel: 27, transportStreamId: null },
    sessions: null,
    ...over,
  }
}

function programme(
  networkId: number,
  serviceId: number,
  name: string,
  startsAt: string,
  endsAt: string | null,
  over: Record<string, unknown> = {},
) {
  return {
    id: `${networkId}-${serviceId}-${startsAt}`,
    networkId,
    serviceId,
    eventId: 1,
    startsAt,
    endsAt,
    name,
    summary: '',
    isShadow: false,
    hasSubtitles: false,
    source: 'eit',
    revision: 1,
    isArchived: false,
    genres: [{ kind: 0, sort: 0 }],
    items: [],
    related: [],
    ...over,
  }
}

test('the channels of the kind asked for arrive with their key, their viewers and what is on air', async () => {
  sent.length = 0
  store.channels = [
    listed(32736, 1024, '総合1', { viewers: 2 }),
    listed(32736, 1025, '総合2', { remoteControlKeyId: null }),
    listed(4, 101, '衛星1', {
      tuning: {
        system: 'isdbSBs',
        physicalChannel: 15,
        transportStreamId: 50001,
      },
    }),
  ]
  store.profiles = [
    {
      name: '720p30',
      codec: 'h264',
      width: 1280,
      height: 720,
      frameRate: { numerator: 30000, denominator: 1001 },
      softwareKilobitsPerSecond: 3000,
      vaapiQuantiser: 24,
    },
  ]
  store.programmes = [
    programme(
      32736,
      1024,
      'いま',
      '2026-08-08T12:00:00Z',
      '2026-08-08T13:00:00Z',
      { hasSubtitles: true },
    ),
    programme(
      32736,
      1024,
      'つぎ',
      '2026-08-08T13:00:00Z',
      '2026-08-08T13:30:00Z',
    ),
    programme(
      32736,
      1024,
      'まえ',
      '2026-08-08T11:00:00Z',
      '2026-08-08T12:00:00Z',
    ),
  ]

  const screen = await getLiveScreen(undefined, '32736-1024', NOW)

  assert.equal(screen.kind, 'terrestrial')
  assert.deepEqual(
    screen.channels.map((channel) => [channel.id, channel.no, channel.viewers]),
    [
      ['32736-1024', '1', 2],
      ['32736-1025', undefined, 0],
    ],
  )
  assert.equal(screen.channels[0].now?.title, 'いま')
  assert.equal(screen.channels[0].now?.hasSubtitles, true)
  assert.equal(screen.channels[0].now?.genreLabel, 'ニュース/報道')
  assert.equal(screen.channels[0].next?.title, 'つぎ')
  assert.equal(screen.channels[1].now, undefined)
  assert.deepEqual(screen.profiles, [
    { name: '720p30', width: 1280, height: 720 },
  ])

  assert.equal(screen.watching?.channel.id, '32736-1024')
  assert.equal(screen.watching?.nowLabel, '21:04')
  assert.equal(screen.watching?.progressPct, 7)
  assert.equal(screen.watching?.restMin, 56)
})

test('the channels are asked for whole, by key, with their tuning', async () => {
  sent.length = 0
  store.channels = []
  store.programmes = []

  await getLiveScreen('bs', undefined, NOW)

  const channels = sent.find((one) => one.path === '/api/live/channels')

  assert.deepEqual(channels?.query, {
    sort: 'remoteControlKey',
    fields: ['tuning'],
    perPage: 200,
  })

  const guide = sent.find((one) => one.path === '/api/programs')

  assert.equal(guide?.query?.type, 'isdbSBs')
  assert.equal(guide?.query?.from, '2026-08-08T06:04:00.000Z')
  assert.equal(guide?.query?.to, '2026-08-08T18:04:00.000Z')
})

test('a channel not on the list is nothing being watched', async () => {
  store.channels = [listed(32736, 1024, '総合1')]
  store.programmes = []

  const screen = await getLiveScreen(undefined, '1-1', NOW)

  assert.equal(screen.watching, undefined)
})

test('a programme with no end said runs half an hour, and a shadow is not on air', () => {
  const at = (minutes: number) =>
    new Date(NOW.getTime() + minutes * 60_000).toISOString()

  const open = [
    programme(32736, 1024, '終了未定', at(-20), null),
    programme(32736, 1024, '影', at(-5), at(30), { isShadow: true }),
    programme(32736, 1024, 'あと', at(10), at(40)),
  ].map((one) => ({
    ...one,
    endsAt: one.endsAt ?? undefined,
    genres: [{ kind: 3, sort: 0 }],
    related: [],
    items: [],
  }))

  const read = nowNextOf(open.filter((one) => !one.isShadow) as never, NOW)

  assert.equal(read.now?.title, '終了未定')
  assert.equal(read.now?.endLabel, undefined)
  assert.equal(read.next?.title, 'あと')

  const later = nowNextOf(
    open.filter((one) => !one.isShadow) as never,
    new Date(NOW.getTime() + 11 * 60_000),
  )

  assert.equal(later.now?.title, 'あと')
  assert.equal(later.next, undefined)
})

/**
 * A service that has split carries what the service it split from is carrying,
 * for the hours it has nothing of its own. The broadcaster says so on the
 * whole service's event — it names the split under a share — and sends the
 * split no event of its own at all, so a row read by service number alone has
 * nothing to show on it.
 */
test('a split carries what the whole is carrying, on air and next', async () => {
  store.channels = [
    listed(32736, 1024, '総合1'),
    listed(32736, 1025, '総合2', { remoteControlKeyId: null }),
  ]
  store.profiles = []
  store.programmes = [
    programme(
      32736,
      1024,
      'あとで分かれる',
      '2026-08-08T12:00:00Z',
      '2026-08-08T13:00:00Z',
      {
        related: [
          { networkId: 32736, serviceId: 1025, eventId: 9, kind: 'shared' },
        ],
      },
    ),
    programme(
      32736,
      1024,
      'このあと',
      '2026-08-08T13:00:00Z',
      '2026-08-08T13:30:00Z',
      {
        related: [
          { networkId: 32736, serviceId: 1025, eventId: 10, kind: 'shared' },
        ],
      },
    ),
  ]

  const screen = await getLiveScreen(undefined, undefined, NOW)
  const split = screen.channels[1]

  assert.equal(split.id, '32736-1025')
  assert.equal(split.now?.title, 'あとで分かれる')
  assert.equal(split.next?.title, 'このあと')
})

/**
 * The hours a split does have something of its own are its own. Two answers to
 * what is on a channel is one answer too many, and the one the split keeps is
 * the one the broadcaster sent to the split.
 */
test('what a split has of its own stands over what it is carrying', async () => {
  store.channels = [
    listed(32736, 1024, '総合1'),
    listed(32736, 1025, '総合2', { remoteControlKeyId: null }),
  ]
  store.profiles = []
  store.programmes = [
    programme(
      32736,
      1024,
      '分け合っているやつ',
      '2026-08-08T12:00:00Z',
      '2026-08-08T13:00:00Z',
      {
        related: [
          { networkId: 32736, serviceId: 1025, eventId: 9, kind: 'shared' },
        ],
      },
    ),
    programme(
      32736,
      1025,
      '枝番の自分のやつ',
      '2026-08-08T12:00:00Z',
      '2026-08-08T13:00:00Z',
    ),
  ]

  const screen = await getLiveScreen(undefined, undefined, NOW)

  assert.equal(screen.channels[1].now?.title, '枝番の自分のやつ')
})

/**
 * A relay and a move name another service and mean the opposite of a share:
 * the same programme at another hour or off another transmitter, which is not
 * what that service is showing now.
 */
test('a relay and a move are not carried onto the service they name', async () => {
  store.channels = [
    listed(32736, 1024, '総合1'),
    listed(32736, 1025, '総合2', { remoteControlKeyId: null }),
  ]
  store.profiles = []
  store.programmes = [
    programme(
      32736,
      1024,
      '中継',
      '2026-08-08T12:00:00Z',
      '2026-08-08T13:00:00Z',
      {
        related: [
          { networkId: 32736, serviceId: 1025, eventId: 9, kind: 'relayed' },
          { networkId: 32736, serviceId: 1025, eventId: 11, kind: 'moved' },
        ],
      },
    ),
  ]

  const screen = await getLiveScreen(undefined, undefined, NOW)

  assert.equal(screen.channels[1].now, undefined)
  assert.equal(screen.channels[1].next, undefined)
})

test('a channel with no programme known stands at nought, and one with no end has no remainder', () => {
  const bare = {
    id: '1-1',
    networkId: 1,
    serviceId: 1,
    name: 'x',
    kind: 'terrestrial' as const,
    viewers: 0,
  }

  assert.deepEqual(watchingOf(bare, NOW), {
    channel: bare,
    progressPct: 0,
    nowLabel: '21:04',
  })

  const undecided = {
    ...bare,
    now: {
      id: 'p',
      title: 'y',
      startsAt: '2026-08-08T11:50:00Z',
      startLabel: '20:50',
      hasSubtitles: false,
      genreLabel: 'その他',
    },
  }

  assert.equal(watchingOf(undecided, NOW).restMin, undefined)
  assert.equal(watchingOf(undecided, NOW).progressPct, 0)
})

const { liveScreenHref } = await import('./live-paths.ts')

/**
 * A way into the live screen is an address the screen writes for itself: the
 * channel in `ch`, and the kind only where it is not the one the screen opens
 * on, so the address from the guide is the one a press on the list would make.
 */
test('the live screen is addressed by channel, and by kind only off the aerial', () => {
  assert.equal(liveScreenHref('32736-1024'), '/live?ch=32736-1024')
  assert.equal(
    liveScreenHref('32736-1024', 'terrestrial'),
    '/live?ch=32736-1024',
  )
  assert.equal(liveScreenHref('4-101', 'bs'), '/live?ch=4-101&kind=bs')
  assert.equal(liveScreenHref('6-1000', 'cs110'), '/live?ch=6-1000&kind=cs110')
})

/**
 * The tuners are counted, not listed: this screen has no use for which ones
 * they are, only for whether there is one at all. A ledger that will not
 * answer leaves the count absent rather than nought, so the screen says
 * nothing about tuners instead of sending the reader off to add the ones they
 * already have.
 */
test('チューナーは数えられ、台帳が答えなければ数そのものが無い', async () => {
  store.channels = [listed(32736, 1024, '総合1')]
  store.profiles = []
  store.programmes = []
  store.tuners = [{}, {}]

  assert.equal((await getLiveScreen(undefined, undefined, NOW)).tuners, 2)

  store.tuners = []

  assert.equal((await getLiveScreen(undefined, undefined, NOW)).tuners, 0)

  store.tuners = undefined

  const unread = await getLiveScreen(undefined, undefined, NOW)

  assert.equal(unread.tuners, undefined)

  // And the rest of the screen is still there: watching does not depend on
  // this ledger, so it does not go down with it.
  assert.equal(unread.channels.length, 1)
})

/**
 * Which broadcast types the screen may offer, and which one it opens on.
 *
 * A type with no channel on it reaches the same nothing from wherever it is
 * pressed, so it is not offered; and where nothing is offered for the type the
 * URL leaves out, the screen opens on the first type that has a channel rather
 * than on an empty one.
 */
test('種別は、チャンネルを持つものだけが並ぶ', async () => {
  store.profiles = []
  store.programmes = []
  store.tuners = []

  const satellite = {
    system: 'isdbSBs',
    physicalChannel: 15,
    transportStreamId: 50001,
  }

  store.channels = [listed(32736, 1024, '総合1')]

  const aerialOnly = await getLiveScreen(undefined, undefined, NOW)

  assert.deepEqual(aerialOnly.kinds, ['terrestrial'])
  assert.equal(aerialOnly.kind, 'terrestrial')

  store.channels = [
    listed(32736, 1024, '総合1'),
    listed(4, 101, '衛星1', { tuning: satellite }),
  ]

  assert.deepEqual((await getLiveScreen(undefined, undefined, NOW)).kinds, [
    'terrestrial',
    'bs',
  ])

  // The aerial has nothing on it, so the screen opens on the one that has.
  store.channels = [listed(4, 101, '衛星1', { tuning: satellite })]

  const satelliteOnly = await getLiveScreen(undefined, undefined, NOW)

  assert.deepEqual(satelliteOnly.kinds, ['bs'])
  assert.equal(satelliteOnly.kind, 'bs')

  // Nothing anywhere leaves nothing to open on, and the screen says so with
  // the type it would have opened on.
  store.channels = []

  const nothing = await getLiveScreen(undefined, undefined, NOW)

  assert.deepEqual(nothing.kinds, [])
  assert.equal(nothing.kind, 'terrestrial')
})

/**
 * A URL that names a type is answered with that type, empty or not: the type
 * is what the reader asked for, and answering with another would be a screen
 * the link does not say.
 */
test('URL が名指した種別は、空でもその種別のまま答える', async () => {
  store.profiles = []
  store.programmes = []
  store.tuners = []
  store.channels = [listed(32736, 1024, '総合1')]

  const asked = await getLiveScreen('cs110', undefined, NOW)

  assert.equal(asked.kind, 'cs110')
  assert.deepEqual(asked.channels, [])
  assert.deepEqual(asked.kinds, ['terrestrial'])
})
