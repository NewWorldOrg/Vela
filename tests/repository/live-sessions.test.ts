import assert from 'node:assert/strict'
import { test } from 'node:test'

import { backlogOf, readLiveSessions } from '@/repository/live-sessions'

const SEAT = {
  networkId: 32736,
  serviceId: 1024,
  profile: '1080p60',
  sound: 'main',
} as const

const ANSWER = {
  status: true,
  message: '',
  data: [
    {
      networkId: 32736,
      serviceId: 1024,
      profile: '1080p60',
      sound: 'main',
      viewers: 2,
      dropped: '18',
      queued: 3,
      chunksDroppedSinceTheSupplyOpened: '328',
      watching: [
        { droppedSinceTheyJoined: '7', queued: 3 },
        { droppedSinceTheyJoined: 5, queued: 1 },
      ],
      startup: { inProgress: false, marks: [] },
    },
    {
      networkId: 32736,
      serviceId: 1024,
      profile: '720p30',
      sound: 'main',
      viewers: 1,
      dropped: 0,
      queued: 0,
      chunksDroppedSinceTheSupplyOpened: null,
      watching: [],
      startup: { inProgress: true, marks: [] },
    },
    {
      networkId: 32736,
      serviceId: 1024,
      profile: '1080p60',
      sound: 'secondary',
      viewers: 1,
      dropped: 4,
      queued: 1,
      chunksDroppedSinceTheSupplyOpened: 9,
      watching: [{ droppedSinceTheyJoined: 4, queued: 1 }],
      startup: { inProgress: false, marks: [] },
    },
  ],
}

test('the sessions are read with their counts as numbers, however JSON spelled them', () => {
  assert.deepEqual(readLiveSessions(ANSWER), [
    {
      networkId: 32736,
      serviceId: 1024,
      profile: '1080p60',
      sound: 'main',
      viewers: 2,
      dropped: 18,
      queued: 3,
      droppedByThoseStillWatching: 12,
      lostOnTheWayIn: 328,
    },
    {
      networkId: 32736,
      serviceId: 1024,
      profile: '720p30',
      sound: 'main',
      viewers: 1,
      dropped: 0,
      queued: 0,
      droppedByThoseStillWatching: 0,
      lostOnTheWayIn: undefined,
    },
    {
      networkId: 32736,
      serviceId: 1024,
      profile: '1080p60',
      sound: 'secondary',
      viewers: 1,
      dropped: 4,
      queued: 1,
      droppedByThoseStillWatching: 4,
      lostOnTheWayIn: 9,
    },
  ])
})

test('no session running is an empty list, not a failure to read', () => {
  assert.deepEqual(
    readLiveSessions({ status: true, message: '', data: [] }),
    [],
  )
  assert.deepEqual(
    readLiveSessions({ status: true, message: '', data: null }),
    [],
  )
})

test('a body that is not the answer reads as nothing at all', () => {
  assert.equal(readLiveSessions(undefined), null)
  assert.equal(readLiveSessions('<html>'), null)
  assert.equal(readLiveSessions({ data: [{ profile: 1 }] }), null)
  assert.equal(readLiveSessions({ data: [{ profile: '1080p60' }] }), null)
})

test('the backlog is the seat’s own: the same channel in another profile is another session', () => {
  const sessions = readLiveSessions(ANSWER)!

  assert.deepEqual(backlogOf(sessions, SEAT), {
    dropped: 18,
    queued: 3,
    droppedByThoseStillWatching: 12,
    lostOnTheWayIn: 328,
  })
  assert.deepEqual(backlogOf(sessions, { ...SEAT, profile: '720p30' }), {
    dropped: 0,
    queued: 0,
    droppedByThoseStillWatching: 0,
    lostOnTheWayIn: undefined,
  })
  assert.equal(backlogOf(sessions, { ...SEAT, serviceId: 1025 }), undefined)
  assert.equal(backlogOf([], SEAT), undefined)
})

test('the same channel in the same profile carrying the other sound is another session', () => {
  const sessions = readLiveSessions(ANSWER)!

  assert.deepEqual(backlogOf(sessions, { ...SEAT, sound: 'secondary' }), {
    dropped: 4,
    queued: 1,
    droppedByThoseStillWatching: 4,
    lostOnTheWayIn: 9,
  })
})

test('what the driver never said is not read as none of it', () => {
  const sessions = readLiveSessions({
    status: true,
    message: '',
    data: [
      {
        networkId: 32736,
        serviceId: 1024,
        profile: '1080p60',
        viewers: 1,
        dropped: 4,
        queued: 0,
        startup: { inProgress: false, marks: [] },
      },
    ],
  })!

  assert.equal(sessions[0].lostOnTheWayIn, undefined)
  assert.equal(sessions[0].droppedByThoseStillWatching, undefined)
  assert.equal(sessions[0].sound, 'main')
})
