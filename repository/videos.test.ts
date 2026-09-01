import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

/**
 * The playback plan and the ticket, with the API standing in for itself. Only
 * the module that reaches the network is replaced; reading the plan, naming
 * the refusal and wording it all run for real.
 */

interface Sent {
  method: string
  path: string
  accept?: string
}

const sent: Sent[] = []

const store: {
  plan: unknown
  planStatus: number
  ticket: unknown
  ticketStatus: number
} = {
  plan: undefined,
  planStatus: 200,
  ticket: undefined,
  ticketStatus: 200,
}

const answered = (status: number) => ({ status, ok: status < 400 })

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({
      GET: async (path: string, init?: { headers?: { accept?: string } }) => {
        sent.push({ method: 'GET', path, accept: init?.headers?.accept })

        return store.planStatus === 200
          ? {
              data: { status: true, message: '', data: store.plan },
              response: answered(200),
            }
          : {
              data: { status: false, message: '', data: null },
              response: answered(store.planStatus),
            }
      },
      POST: async (path: string) => {
        sent.push({ method: 'POST', path })

        return store.ticketStatus === 200
          ? {
              data: { status: true, message: '', data: store.ticket },
              response: answered(200),
            }
          : {
              data: { status: false, message: '', data: null },
              response: answered(store.ticketStatus),
            }
      },
    }),
    revalidatingCarinaClient: () => {
      throw new Error('a playback plan is never held')
    },
  },
})

const { getPlaybackPlan, takePlaybackTicket } = await import('./videos.ts')

test('the plan is asked for as the plan, not as the picture', async () => {
  sent.length = 0
  store.planStatus = 200
  store.plan = {
    standing: 'whole',
    route: 'onTheFly',
    seeking: 'byStartingAgain',
    canSeek: false,
    transcodes: true,
    showsAsAWholeRecording: true,
    mediaType: 'video/mp4',
    bytes: null,
  }

  const read = await getPlaybackPlan('1266')

  assert.deepEqual(sent, [
    {
      method: 'GET',
      path: '/api/videos/{id}/play',
      accept: 'application/json',
    },
  ])
  assert.deepEqual(read, {
    state: 'planned',
    plan: {
      standing: 'whole',
      route: 'onTheFly',
      seeking: 'byStartingAgain',
      canSeek: false,
      transcodes: true,
      showsAsAWholeRecording: true,
      mediaType: 'video/mp4',
      bytes: undefined,
    },
  })
})

/**
 * A recording handed over as it is carries its size, and the size is spelled
 * as a string where it would not survive as a number. It is read back into one
 * so nothing downstream compares a numeral against a string.
 */
test('a stream that answers a byte range carries its length', async () => {
  store.planStatus = 200
  store.plan = {
    standing: 'cutShort',
    route: 'direct',
    seeking: 'byRange',
    canSeek: true,
    transcodes: false,
    showsAsAWholeRecording: false,
    mediaType: 'video/mp4',
    bytes: '3490550128',
  }

  const read = await getPlaybackPlan('1247')

  assert.equal(read.state, 'planned')
  assert.equal(read.state === 'planned' && read.plan.bytes, 3_490_550_128)
  assert.equal(read.state === 'planned' && read.plan.standing, 'cutShort')
})

/**
 * Four refusals, four answers. A recording still being written, one that wrote
 * nothing and a file out of reach are different things to do next, so they are
 * not collapsed into one.
 */
test('each refusal keeps its own name', async () => {
  const named: Record<number, string> = {}

  for (const status of [400, 404, 409, 503, 500]) {
    store.planStatus = status
    const read = await getPlaybackPlan(`r-${status}`)

    assert.equal(read.state, 'refused')
    named[status] = read.state === 'refused' ? read.refusal : ''
  }

  assert.deepEqual(named, {
    400: 'nothingToPlay',
    404: 'nothingToPlay',
    409: 'stillRecording',
    503: 'outOfReach',
    500: 'unreadable',
  })
})

test('a ticket comes back with the moment it lapses', async () => {
  sent.length = 0
  store.ticketStatus = 200
  store.ticket = {
    inTheClear: 'a-ticket-that-lapses',
    lapsesAt: '2026-09-01T12:56:14Z',
  }

  const write = await takePlaybackTicket('1266')

  assert.deepEqual(sent, [{ method: 'POST', path: '/api/videos/{id}/ticket' }])
  assert.deepEqual(write, {
    state: 'ok',
    ticket: {
      inTheClear: 'a-ticket-that-lapses',
      lapsesAt: '2026-09-01T12:56:14Z',
    },
  })
})

test('a refused ticket is worded, and the status is not left to speak', async () => {
  store.ticketStatus = 429

  const write = await takePlaybackTicket('1266')

  assert.equal(write.state, 'refused')
  assert.equal(
    write.state === 'refused' && write.message,
    '発行の上限に達しています。しばらく待つと発行できます。',
  )
})

test('a status nobody worded still says something', async () => {
  store.ticketStatus = 418

  const write = await takePlaybackTicket('1266')

  assert.equal(
    write.state === 'refused' && write.message,
    '外部プレイヤーの札を発行できませんでした(418)。',
  )
})
