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

/** An hour inside the broadcast day the guide opens on, in ISO. */
function soon(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString()
}

/** The broadcast day an instant falls in, which is the day the guide opens on. */
function broadcastDay(at: string): string {
  return new Date(
    new Date(at).getTime() + JST_OFFSET_MS - DAY_TURNS_AT_HOUR * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10)
}

const STARTS = soon(2)
const ENDS = soon(3.5)

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
