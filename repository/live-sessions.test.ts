import assert from 'node:assert/strict'
import { test } from 'node:test'

import { backlogOf, readLiveSessions } from './live-sessions.ts'

const SEAT = { networkId: 32736, serviceId: 1024, profile: '1080p60' }

/** The answer as the API writes it, with the numbers spelled the way JSON hands them over. */
const ANSWER = {
  status: true,
  message: '',
  data: [
    {
      networkId: 32736,
      serviceId: 1024,
      profile: '1080p60',
      viewers: 2,
      dropped: '18',
      queued: 3,
      startup: { inProgress: false, marks: [] },
    },
    {
      networkId: 32736,
      serviceId: 1024,
      profile: '720p30',
      viewers: 1,
      dropped: 0,
      queued: 0,
      startup: { inProgress: true, marks: [] },
    },
  ],
}

test('the sessions are read with their counts as numbers, however JSON spelled them', () => {
  assert.deepEqual(readLiveSessions(ANSWER), [
    {
      networkId: 32736,
      serviceId: 1024,
      profile: '1080p60',
      viewers: 2,
      dropped: 18,
      queued: 3,
    },
    {
      networkId: 32736,
      serviceId: 1024,
      profile: '720p30',
      viewers: 1,
      dropped: 0,
      queued: 0,
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

  assert.deepEqual(backlogOf(sessions, SEAT), { dropped: 18, queued: 3 })
  assert.deepEqual(backlogOf(sessions, { ...SEAT, profile: '720p30' }), {
    dropped: 0,
    queued: 0,
  })
  assert.equal(backlogOf(sessions, { ...SEAT, serviceId: 1025 }), undefined)
  assert.equal(backlogOf([], SEAT), undefined)
})
