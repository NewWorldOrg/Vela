import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

/**
 * A programme read two ways, with the API standing in for itself.
 *
 * The guide hands back a whole day of programmes and a programme's own address
 * hands back one, and both are now read for the same thing — the layer the
 * guide opens is the reading, not a way through to one. Two readings of the
 * same broadcast that are each correct on their own can still disagree, and
 * nothing about either one on its own would say so. So the same store answers
 * both, and what they produce is held against each other.
 */

/** JST, and the hour a broadcast day turns over: facts about the broadcast. */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_TURNS_AT_HOUR = 4

const service = (
  networkId: number,
  serviceId: number,
  name: string,
  remoteControlKeyId: number,
) => ({
  networkId,
  serviceId,
  name,
  category: 'television',
  remoteControlKeyId,
  selectedChannel: { system: 'isdbT' },
  candidates: [],
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
} = { services: [], programmes: [] }

const answer = async (
  path: string,
  init?: { params?: { path?: Record<string, string> } },
) => {
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

const { getGuide, getProgram } = await import('./programs.ts')

/** The broadcast day an instant falls in, which is the day the guide opens on. */
function broadcastDay(at: string): string {
  return new Date(
    new Date(at).getTime() + JST_OFFSET_MS - DAY_TURNS_AT_HOUR * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10)
}

/** The instant the broadcast day the guide opens on began. */
const DAY_TURNED = new Date(
  new Date(`${broadcastDay(new Date().toISOString())}T00:00:00Z`).getTime() +
    DAY_TURNS_AT_HOUR * 60 * 60 * 1000 -
    JST_OFFSET_MS,
)

/**
 * An hour of the broadcast day the guide opens on, in ISO.
 *
 * Counted from the top of that day and not off the clock. Hours counted
 * forward from now leave the window whenever the tests are run in the hours
 * before the day turns — two hours on from one in the morning is past four,
 * which is the next day's window — and a run the guide clips away for part of
 * the day makes every assertion about the column a fact about the hour the
 * tests happened to be run at.
 */
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

/**
 * The one that no amount of testing either reading on its own can stand in
 * for. Both are asked for the same broadcast and the answers are held against
 * each other whole — and the reading is held against what was sent first, so a
 * pair that agree by both being empty does not pass for agreement.
 */
test('the guide and the address answer with the same programme', async () => {
  standing()

  const inTheGuide = await fromTheGuide(idOf(CARRIED))
  const atItsAddress = await fromItsOwnAddress(idOf(CARRIED))

  assert.ok(inTheGuide.items && inTheGuide.items.length > 0)
  assert.ok(inTheGuide.related && inTheGuide.related.length > 0)
  assert.deepEqual(atItsAddress, inTheGuide)
})

/**
 * A programme the broadcaster said nothing more about. Absent is drawn as
 * nothing, not as a gap: the reading is one part now, so what it is handed for
 * an empty programme is what both places draw.
 */
test('a programme with nothing extra carries nothing rather than a gap', async () => {
  standing()

  const inTheGuide = await fromTheGuide(idOf(ELSEWHERE))
  const atItsAddress = await fromItsOwnAddress(idOf(ELSEWHERE))

  assert.deepEqual(inTheGuide.items, [])
  assert.deepEqual(inTheGuide.related, [])
  assert.equal(inTheGuide.description, undefined)
  assert.deepEqual(atItsAddress, inTheGuide)
})

/** The service a related listing sits on is named, whichever way it is read. */
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

/**
 * The programme's own address carries where now falls in its day, the way the
 * guide does, so what is on air is read from one reading of the clock. A day
 * that is not today has no present in it, and the address says so by carrying
 * nothing.
 */
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

/**
 * The service a station splits into for part of the day, and carries its
 * broadcast on for the rest of it.
 *
 * The station sends nothing at all on the split for the hours it is not split
 * — those events reach the guide as shadows and are dropped — and says which
 * hours those are on its own event, by naming the split under a share.
 */
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

/**
 * The defect this stands against: the hours a split is carrying the station's
 * broadcast read as hours with no schedule, while the hours it has something
 * of its own read normally — so a column showing the same thing as the one
 * beside it looked like a channel that had stopped.
 */
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

/**
 * What a shared cell opens is the broadcast itself, sitting where it is
 * listed. Reserving it from the split's column and from the station's column
 * is the one reservation, because it is the one broadcast.
 */
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

/**
 * A split says nothing about which column its hours are to be read against:
 * the number in front of it is the station's, and the order the columns
 * arrived in is a sort. The column carries it, so the fold has it.
 */
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

/**
 * A broadcast names the splits it is shared onto and never itself, so read
 * from one of those splits the others are named and the service all of them
 * are carrying is not — which is the one a reader is most likely to be after.
 */
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
