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
} = { channels: [], profiles: [], programmes: [] }

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
  const channel = { networkId: 32736, serviceId: 1024 }
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

  const read = nowNextOf(
    open.filter((one) => !one.isShadow) as never,
    channel,
    NOW,
  )

  assert.equal(read.now?.title, '終了未定')
  assert.equal(read.now?.endLabel, undefined)
  assert.equal(read.next?.title, 'あと')

  const later = nowNextOf(
    open.filter((one) => !one.isShadow) as never,
    channel,
    new Date(NOW.getTime() + 11 * 60_000),
  )

  assert.equal(later.now?.title, 'あと')
  assert.equal(later.next, undefined)
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
