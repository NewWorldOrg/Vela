import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

import type { SoundTrack } from '@/repository/sounds'

interface Sent {
  method: string
  path: string
  accept?: string
  sound?: string
  positionSec?: number
}

const sent: Sent[] = []

const store: {
  plan: unknown
  planStatus: number
  ticket: unknown
  ticketStatus: number
  profiles: unknown[]
  profilesStatus: number
  positionStatus: number
} = {
  plan: undefined,
  planStatus: 200,
  ticket: undefined,
  ticketStatus: 200,
  profiles: [],
  profilesStatus: 200,
  positionStatus: 200,
}

const answered = (status: number) => ({ status, ok: status < 400 })

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({
      GET: async (
        path: string,
        init?: {
          headers?: { accept?: string }
          params?: { query?: { sound?: string } }
        },
      ) => {
        sent.push({
          method: 'GET',
          path,
          accept: init?.headers?.accept,
          sound: init?.params?.query?.sound,
        })

        if (path === '/api/live/profiles') {
          return store.profilesStatus === 200
            ? {
                data: { status: true, message: '', data: store.profiles },
                response: answered(200),
              }
            : {
                error: { status: false, message: '', data: null },
                response: answered(store.profilesStatus),
              }
        }

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
      PUT: async (path: string, init?: { body?: { positionSec?: number } }) => {
        sent.push({
          method: 'PUT',
          path,
          positionSec: init?.body?.positionSec,
        })

        return store.positionStatus === 200
          ? {
              data: { status: true, message: '', data: null },
              response: answered(200),
            }
          : {
              data: { status: false, message: '', data: null },
              response: answered(store.positionStatus),
            }
      },
    }),
    revalidatingCarinaClient: () => {
      throw new Error('a playback plan is never held')
    },
  },
})

const {
  getPlaybackPlan,
  getUnaskedPlaybackProfile,
  keepPlaybackPosition,
  takePlaybackTicket,
} = await import('@/repository/videos')

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
    sounds: ['main', 'secondary'],
    chapters: [],
  }

  const read = await getPlaybackPlan('1266')

  assert.deepEqual(sent, [
    {
      method: 'GET',
      path: '/api/videos/{id}/play',
      accept: 'application/json',
      sound: undefined,
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
      resumeAtSec: undefined,
      sounds: ['main', 'secondary'],
      chapters: [],
    },
  })
})

test('the plan for a sound is asked for by naming it', async () => {
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
    sounds: ['main', 'secondary'],
  }

  const read = await getPlaybackPlan('1266', 'secondary')

  assert.deepEqual(sent, [
    {
      method: 'GET',
      path: '/api/videos/{id}/play',
      accept: 'application/json',
      sound: 'secondary',
    },
  ])
  assert.equal(read.state === 'planned' && read.plan.seeking, 'byStartingAgain')
})

test('a sound this build does not offer is refused here, and never asked of the endpoint', async () => {
  sent.length = 0
  store.planStatus = 200

  const read = await getPlaybackPlan('1266', 'surround' as SoundTrack)

  assert.deepEqual(read, { state: 'refused', refusal: 'nothingToPlay' })
  assert.deepEqual(sent, [])
})

test('the plan for the sound that is handed over names it as well', async () => {
  sent.length = 0
  store.planStatus = 200
  store.plan = {
    standing: 'whole',
    route: 'direct',
    seeking: 'byRange',
    canSeek: true,
    transcodes: false,
    showsAsAWholeRecording: true,
    mediaType: 'video/mp4',
    bytes: '3490550128',
    sounds: ['main', 'secondary'],
  }

  const read = await getPlaybackPlan('1266', 'main')

  assert.deepEqual(sent.at(0)?.sound, 'main')
  assert.equal(read.state === 'planned' && read.plan.canSeek, true)
  assert.deepEqual(read.state === 'planned' && read.plan.sounds, [
    'main',
    'secondary',
  ])
})

test('a plan from a build that never named the sounds offers none to choose', async () => {
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

  assert.deepEqual(read.state === 'planned' && read.plan.sounds, [])
})

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
    sounds: [],
  }

  const read = await getPlaybackPlan('1247')

  assert.equal(read.state, 'planned')
  assert.equal(read.state === 'planned' && read.plan.bytes, 3_490_550_128)
  assert.equal(read.state === 'planned' && read.plan.standing, 'cutShort')
})

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

test('the breaks a recording was marked with come back as they were read', async () => {
  store.planStatus = 200
  store.plan = {
    standing: 'whole',
    route: 'direct',
    seeking: 'byRange',
    canSeek: true,
    transcodes: false,
    showsAsAWholeRecording: true,
    mediaType: 'video/mp4',
    bytes: '3490550128',
    sounds: ['main'],
    chapters: [
      { startsAtSec: 0, endsAtSec: '212.5', kind: 'programme' },
      { startsAtSec: '212.5', endsAtSec: 272.5, kind: 'break' },
      { startsAtSec: 272.5, endsAtSec: 1800, kind: 'programme' },
    ],
  }

  const read = await getPlaybackPlan('1266')

  assert.deepEqual(read.state === 'planned' && read.plan.chapters, [
    { startsAtSec: 0, endsAtSec: 212.5, kind: 'programme' },
    { startsAtSec: 212.5, endsAtSec: 272.5, kind: 'break' },
    { startsAtSec: 272.5, endsAtSec: 1800, kind: 'programme' },
  ])
})

test('a recording nobody marked is handed over with no chapters at all', async () => {
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
    sounds: ['main'],
    chapters: [],
  }

  const read = await getPlaybackPlan('1266')

  assert.deepEqual(read.state === 'planned' && read.plan.chapters, [])
})

test('a plan from a build that never named the chapters offers none to jump to', async () => {
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
    sounds: ['main'],
  }

  const read = await getPlaybackPlan('1266')

  assert.deepEqual(read.state === 'planned' && read.plan.chapters, [])
})

test('a kind this build has never heard of is still carried, and named as unknown', async () => {
  store.planStatus = 200
  store.plan = {
    standing: 'whole',
    route: 'direct',
    seeking: 'byRange',
    canSeek: true,
    transcodes: false,
    showsAsAWholeRecording: true,
    mediaType: 'video/mp4',
    bytes: '3490550128',
    sounds: ['main'],
    chapters: [
      { startsAtSec: 0, endsAtSec: 300, kind: 'programme' },
      { startsAtSec: 300, endsAtSec: 360, kind: 'trailer' },
    ],
  }

  const read = await getPlaybackPlan('1266')

  assert.deepEqual(read.state === 'planned' && read.plan.chapters, [
    { startsAtSec: 0, endsAtSec: 300, kind: 'programme' },
    { startsAtSec: 300, endsAtSec: 360, kind: 'unknown' },
  ])
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

test('a lapsed session is answered as that, not as a sentence with a number in it', async () => {
  store.ticketStatus = 401

  const write = await takePlaybackTicket('1266')

  assert.deepEqual(write, { state: 'unauthenticated' })
})

test('a status nobody worded still says something', async () => {
  store.ticketStatus = 418

  const write = await takePlaybackTicket('1266')

  assert.equal(
    write.state === 'refused' && write.message,
    '外部プレイヤーの札を発行できませんでした(418)。',
  )
})

function profile(name: string, unasked: boolean) {
  return { name, width: 1920, height: 1080, unasked }
}

const WITH_A_CARD = [
  profile('1080p60', true),
  profile('1080p30', false),
  profile('720p30', false),
]

const WITHOUT_ONE = [
  profile('1080p60', false),
  profile('1080p30', false),
  profile('720p30', true),
]

test('a recording opens at the profile the machine marks as its own', async () => {
  store.profilesStatus = 200
  store.profiles = WITH_A_CARD

  assert.equal(await getUnaskedPlaybackProfile(), '1080p60')
})

test('a machine without a card names the smaller one, and that is honoured too', async () => {
  store.profilesStatus = 200
  store.profiles = WITHOUT_ONE

  assert.equal(await getUnaskedPlaybackProfile(), '720p30')
})

test('a list that cannot be read leaves the profile unasked', async () => {
  store.profilesStatus = 503
  store.profiles = []

  assert.equal(await getUnaskedPlaybackProfile(), undefined)
})

test('a name the play endpoint would refuse is not asked for', async () => {
  store.profilesStatus = 200
  store.profiles = [profile('480p30', true)]

  assert.equal(await getUnaskedPlaybackProfile(), undefined)
})

const WATCHED_IN_PART = {
  standing: 'whole',
  route: 'onTheFly',
  seeking: 'byStartingAgain',
  canSeek: false,
  transcodes: true,
  showsAsAWholeRecording: true,
  mediaType: 'video/mp4',
  bytes: null,
  sounds: ['main'],
  chapters: [],
}

test('the plan says where this reader last left the recording', async () => {
  store.planStatus = 200
  store.plan = { ...WATCHED_IN_PART, resumeAtSec: '612.5' }

  const read = await getPlaybackPlan('r-left-off')

  assert.equal(read.state === 'planned' && read.plan.resumeAtSec, 612.5)
})

test('a recording this reader has never watched is left with no position at all', async () => {
  store.planStatus = 200
  store.plan = { ...WATCHED_IN_PART, resumeAtSec: null }

  const read = await getPlaybackPlan('r-never-watched')

  assert.equal(read.state === 'planned' && read.plan.resumeAtSec, undefined)
})

test('a plan from a build that never said where a reader left off leaves it unsaid', async () => {
  store.planStatus = 200
  store.plan = { ...WATCHED_IN_PART }

  const read = await getPlaybackPlan('r-older-build')

  assert.equal(read.state === 'planned' && read.plan.resumeAtSec, undefined)
})

test('the position a reader reached is written to the recording it belongs to', async () => {
  sent.length = 0
  store.positionStatus = 200

  const write = await keepPlaybackPosition('1266', 612)

  assert.deepEqual(sent, [
    { method: 'PUT', path: '/api/videos/{id}/position', positionSec: 612 },
  ])
  assert.deepEqual(write, { state: 'ok' })
})

test('a position the endpoint would not take is answered as that, and never as kept', async () => {
  for (const status of [400, 404, 409, 500]) {
    store.positionStatus = status

    assert.deepEqual(await keepPlaybackPosition('1266', 612), {
      state: 'notKept',
    })
  }
})
