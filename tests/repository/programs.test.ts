import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const JST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_TURNS_AT_HOUR = 4

const service = (
  networkId: number,
  serviceId: number,
  name: string,
  remoteControlKeyId: number,
  logo: { declaration: string; url?: string } = { declaration: 'notYetRead' },
) => ({
  networkId,
  serviceId,
  name,
  category: 'television',
  remoteControlKeyId,
  selectedChannel: { system: 'isdbT' },
  candidates: [],
  logoDeclaration: logo.declaration,
  logo:
    logo.url === undefined
      ? null
      : { url: logo.url, collectedAt: '2026-09-05T09:00:00Z' },
})

interface Extra {
  summary?: string
  items?: { heading: string; text: string }[]
  related?: {
    networkId: number
    serviceId: number
    eventId: number
    kind: string
  }[]
}

const programme = (
  networkId: number,
  serviceId: number,
  eventId: number,
  name: string,
  startsAt: string,
  endsAt: string,
  extra: Extra = {},
) => ({
  id: `${networkId}-${serviceId}-${eventId}`,
  networkId,
  serviceId,
  eventId,
  startsAt,
  endsAt,
  name,
  summary: extra.summary ?? '',
  isShadow: false,
  hasSubtitles: true,
  isArchived: false,
  genres: [{ kind: 1, sort: 0 }],
  items: extra.items ?? [],
  related: extra.related ?? [],
})

const store: {
  services: unknown[]
  programmes: ReturnType<typeof programme>[]
  refusing?: { path: string; status: number; message: string }
} = { services: [], programmes: [] }

const answer = async (
  path: string,
  init?: { params?: { path?: Record<string, string> } },
) => {
  if (store.refusing?.path === path) {
    return {
      data: undefined,
      error: { status: false, message: store.refusing.message, data: null },
      response: { status: store.refusing.status },
    }
  }

  if (path === '/api/services') {
    return { data: { data: store.services }, response: { status: 200 } }
  }

  if (path === '/api/programs') {
    return {
      data: { data: { services: [], programmes: store.programmes } },
      response: { status: 200 },
    }
  }

  if (path === '/api/programs/{id}') {
    const wanted = init?.params?.path?.id
    const found = store.programmes.find((one) => one.id === wanted)

    return found
      ? { data: { data: found }, response: { status: 200 } }
      : { data: undefined, response: { status: 404 } }
  }

  throw new Error(`nothing stands in for ${path}`)
}

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({ GET: answer }),
    revalidatingCarinaClient: () => ({ GET: answer }),
  },
})

const { getGuide, getProgram } = await import('@/repository/programs')

function broadcastDay(at: string): string {
  return new Date(
    new Date(at).getTime() + JST_OFFSET_MS - DAY_TURNS_AT_HOUR * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10)
}

const DAY_TURNED = new Date(
  new Date(`${broadcastDay(new Date().toISOString())}T00:00:00Z`).getTime() +
    DAY_TURNS_AT_HOUR * 60 * 60 * 1000 -
    JST_OFFSET_MS,
)

function hourOfTheDay(hour: number): string {
  return new Date(DAY_TURNED.getTime() + hour * 60 * 60 * 1000).toISOString()
}

const STARTS = hourOfTheDay(8)
const ENDS = hourOfTheDay(9.5)

const CARRIED = {
  networkId: 33221,
  serviceId: 1521,
  eventId: 40613,
}

const ELSEWHERE = { networkId: 33221, serviceId: 1531, eventId: 40622 }

const ITEMS = [
  {
    heading: '番組内容',
    text: '前半は現地から、後半は資料をたどって整理する。',
  },
  { heading: '出演者', text: '【司会】辻堂 まり\n【解説】担当記者 石動 亨' },
]

function standing(): void {
  store.services = [
    service(CARRIED.networkId, CARRIED.serviceId, 'みなと総合1', 1),
    service(ELSEWHERE.networkId, ELSEWHERE.serviceId, 'みなと教育1', 9),
  ]
  store.programmes = [
    programme(
      CARRIED.networkId,
      CARRIED.serviceId,
      CARRIED.eventId,
      '入り江のアトリエ 夏の三日間',
      STARTS,
      ENDS,
      {
        summary: '入り江の小さな工房を三日にわたってたずねる。',
        items: ITEMS,
        related: [{ ...ELSEWHERE, kind: 'relayed' }],
      },
    ),
    programme(
      ELSEWHERE.networkId,
      ELSEWHERE.serviceId,
      ELSEWHERE.eventId,
      '深夜の気象情報',
      STARTS,
      ENDS,
    ),
  ]
}

const idOf = (of: { networkId: number; serviceId: number; eventId: number }) =>
  `${of.networkId}-${of.serviceId}-${of.eventId}`

async function fromTheGuide(id: string) {
  const guide = await getGuide('terrestrial', broadcastDay(STARTS))
  const found = guide.programs.find((one) => one.id === id)

  assert.ok(found, `the guide is not showing ${id}`)

  return found
}

async function fromItsOwnAddress(id: string) {
  const detail = await getProgram(id)

  assert.ok(detail, `${id} has no page of its own`)

  return detail.program
}

test('what the broadcaster sent beyond the summary reaches the guide', async () => {
  standing()

  const program = await fromTheGuide(idOf(CARRIED))

  assert.deepEqual(program.items, ITEMS)
  assert.deepEqual(program.related, [
    { key: idOf(ELSEWHERE), kind: 'relayed', channelLabel: '9 みなと教育1' },
  ])
  assert.equal(program.durationLabel, '1時間30分')
})

test('the guide and the address answer with the same programme', async () => {
  standing()

  const inTheGuide = await fromTheGuide(idOf(CARRIED))
  const atItsAddress = await fromItsOwnAddress(idOf(CARRIED))

  assert.ok(inTheGuide.items && inTheGuide.items.length > 0)
  assert.ok(inTheGuide.related && inTheGuide.related.length > 0)
  assert.deepEqual(atItsAddress, inTheGuide)
})

test('a programme with nothing extra carries nothing rather than a gap', async () => {
  standing()

  const inTheGuide = await fromTheGuide(idOf(ELSEWHERE))
  const atItsAddress = await fromItsOwnAddress(idOf(ELSEWHERE))

  assert.deepEqual(inTheGuide.items, [])
  assert.deepEqual(inTheGuide.related, [])
  assert.equal(inTheGuide.description, undefined)
  assert.deepEqual(atItsAddress, inTheGuide)
})

test('the channel a related listing names is resolved at both readings', async () => {
  standing()

  const inTheGuide = await fromTheGuide(idOf(CARRIED))
  const atItsAddress = await fromItsOwnAddress(idOf(CARRIED))

  assert.equal(inTheGuide.related?.[0]?.channelLabel, '9 みなと教育1')
  assert.equal(
    atItsAddress.related?.[0]?.channelLabel,
    inTheGuide.related?.[0]?.channelLabel,
  )
})

test('the address carries where now falls in its day, and nothing on another day', async () => {
  standing()

  const detail = await getProgram(idOf(CARRIED))

  assert.ok(detail)
  assert.equal(typeof detail.nowMin, 'number')

  const elsewhen = await getProgram(
    idOf(CARRIED),
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  )

  assert.ok(elsewhen)
  assert.equal(elsewhen.nowMin, undefined)
})

const SPLIT = { networkId: CARRIED.networkId, serviceId: 1522, eventId: 40711 }

function splitting(): void {
  store.services = [
    service(CARRIED.networkId, CARRIED.serviceId, 'みなと総合1', 1),
    service(SPLIT.networkId, SPLIT.serviceId, 'みなと総合2', 1),
  ]
  store.programmes = [
    programme(
      CARRIED.networkId,
      CARRIED.serviceId,
      CARRIED.eventId,
      '入り江のアトリエ 夏の三日間',
      STARTS,
      ENDS,
      { related: [{ ...SPLIT, kind: 'shared' }] },
    ),
    programme(
      SPLIT.networkId,
      SPLIT.serviceId,
      SPLIT.eventId,
      '高校野球 県大会 準決勝',
      hourOfTheDay(10),
      hourOfTheDay(12),
    ),
  ]
}

test('a service the line-up hands over is a column of the guide', async () => {
  splitting()

  const guide = await getGuide('terrestrial', broadcastDay(STARTS))

  assert.deepEqual(
    guide.channels.map((channel) => channel.name),
    ['みなと総合1', 'みなと総合2'],
  )
})

test('the hours a split is sharing carry what it is sharing', async () => {
  splitting()

  const guide = await getGuide('terrestrial', broadcastDay(STARTS))
  const column = guide.programs.filter(
    (program) => program.channelId === `${SPLIT.networkId}-${SPLIT.serviceId}`,
  )

  assert.deepEqual(
    column.map((program) => program.title),
    ['高校野球 県大会 準決勝', '入り江のアトリエ 夏の三日間'],
  )
})

test('a shared cell is the broadcast it shares, not a copy of it', async () => {
  splitting()

  const guide = await getGuide('terrestrial', broadcastDay(STARTS))
  const shared = guide.programs.filter(
    (program) => program.id === idOf(CARRIED),
  )

  assert.deepEqual(
    shared.map((program) => program.channelId),
    [
      `${CARRIED.networkId}-${CARRIED.serviceId}`,
      `${SPLIT.networkId}-${SPLIT.serviceId}`,
    ],
  )
})

test('a split column names the column it split from', async () => {
  splitting()

  const guide = await getGuide('terrestrial', broadcastDay(STARTS))

  assert.deepEqual(
    guide.channels.map((channel) => [channel.id, channel.sub, channel.whole]),
    [
      [`${CARRIED.networkId}-${CARRIED.serviceId}`, undefined, undefined],
      [
        `${SPLIT.networkId}-${SPLIT.serviceId}`,
        true,
        `${CARRIED.networkId}-${CARRIED.serviceId}`,
      ],
    ],
  )
})

test('a shared cell names the channel the broadcast is listed under', async () => {
  splitting()

  const guide = await getGuide('terrestrial', broadcastDay(STARTS))
  const [listed, shared] = guide.programs.filter(
    (program) => program.id === idOf(CARRIED),
  )

  assert.deepEqual(listed.related, [
    { key: idOf(SPLIT), kind: 'shared', channelLabel: '1 みなと総合2' },
  ])
  assert.deepEqual(shared.related, [
    { key: idOf(CARRIED), kind: 'shared', channelLabel: '1 みなと総合1' },
  ])
})

test('a guide that will not be read throws what the API said about it', async () => {
  store.services = []
  store.programmes = []

  store.refusing = {
    path: '/api/programs',
    status: 503,
    message: 'The guide is being rebuilt and answers nothing meanwhile.',
  }
  await assert.rejects(
    () => getGuide('terrestrial', broadcastDay(STARTS)),
    /The guide is being rebuilt and answers nothing meanwhile\./,
  )

  store.refusing = {
    path: '/api/programs/{id}',
    status: 500,
    message: 'The programme could not be read out of the guide.',
  }
  await assert.rejects(
    () => getProgram(idOf(CARRIED)),
    /The programme could not be read out of the guide\./,
  )

  store.refusing = { path: '/api/programs/{id}', status: 500, message: '' }
  await assert.rejects(
    () => getProgram(idOf(CARRIED)),
    /番組を読めませんでした/,
  )

  store.refusing = {
    path: '/api/services',
    status: 503,
    message: 'The service ledger is out of reach.',
  }
  await assert.rejects(
    () => getGuide('terrestrial', broadcastDay(STARTS)),
    /The service ledger is out of reach\./,
  )

  store.refusing = undefined
})

test('a station whose logo has been read hands the guide the address to draw it from', async () => {
  standing()
  store.services = [
    service(CARRIED.networkId, CARRIED.serviceId, 'みなと総合1', 1, {
      declaration: 'inTheCommonDataTable',
      url: '/api/services/32736-1024/logo',
    }),
  ]

  const guide = await getGuide('terrestrial', broadcastDay(STARTS))

  assert.deepEqual(guide.channels[0].logo, {
    declaration: 'inTheCommonDataTable',
    href: '/api/services/32736-1024/logo',
  })
})

test('a station that broadcasts none and one not read yet are told apart, and neither hands over an address', async () => {
  standing()
  store.services = [
    service(CARRIED.networkId, CARRIED.serviceId, 'みなと総合1', 1, {
      declaration: 'noPictureIsBroadcast',
    }),
    service(ELSEWHERE.networkId, ELSEWHERE.serviceId, 'みなと教育1', 9, {
      declaration: 'notYetRead',
    }),
  ]

  const guide = await getGuide('terrestrial', broadcastDay(STARTS))

  assert.deepEqual(guide.channels[0].logo, {
    declaration: 'noPictureIsBroadcast',
  })
  assert.deepEqual(guide.channels[1].logo, { declaration: 'notYetRead' })
})

test('a station the table claims a picture for, with none carried, is read as not yet read', async () => {
  standing()
  store.services = [
    service(CARRIED.networkId, CARRIED.serviceId, 'みなと総合1', 1, {
      declaration: 'inTheCommonDataTable',
    }),
  ]

  const guide = await getGuide('terrestrial', broadcastDay(STARTS))

  assert.deepEqual(guide.channels[0].logo, { declaration: 'notYetRead' })
})
