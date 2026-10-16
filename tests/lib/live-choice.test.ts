import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  channelBeingWatched,
  choiceStillStands,
  watchingChosen,
} from '@/lib/live-choice'
import type { LiveChannel, LiveScreen } from '@/repository/live'

const AT = new Date('2026-08-08T12:15:00Z')

function channel(id: string, from: string, to: string): LiveChannel {
  const [networkId, serviceId] = id.split('-').map(Number)

  return {
    id,
    networkId,
    serviceId,
    name: `channel ${id}`,
    kind: 'terrestrial',
    viewers: 0,
    now: {
      id: `${id}-now`,
      title: 'on air',
      startsAt: from,
      endsAt: to,
      startLabel: '',
      endLabel: '',
      hasSubtitles: false,
      sounds: 1,
      audio: 'stereo',
      genreLabel: '',
    },
  }
}

const A = channel('1-1', '2026-08-08T12:00:00Z', '2026-08-08T13:00:00Z')

const B = channel('1-2', '2026-08-08T12:10:00Z', '2026-08-08T12:40:00Z')

function answered(watching?: LiveChannel): LiveScreen {
  return {
    kind: 'terrestrial',
    kinds: ['terrestrial'],
    channels: [A, B],
    watching: watching && {
      channel: watching,
      progressPct: 0,
      nowLabel: '21:00',
    },
    profiles: [],
    tuners: 1,
  }
}

test('with nothing chosen in this browser, the url says which channel is being watched', () => {
  assert.equal(channelBeingWatched(undefined, 'a-1', 'a-1'), 'a-1')
})

test('the channel just chosen is the one being watched, before the url has caught up', () => {
  assert.equal(
    channelBeingWatched({ asked: 'a-1', chosen: 'b-1' }, 'a-1', 'a-1'),
    'b-1',
  )
})

test('the url catching up says the same channel, so nothing moves while the page is still answering', () => {
  assert.equal(
    channelBeingWatched({ asked: 'a-1', chosen: 'b-1' }, 'b-1', 'a-1'),
    'b-1',
  )
})

test('a choice the url has already carried is spent, and does not come back when the url returns to where it was made', () => {
  const choice = { asked: 'a-1', chosen: 'b-1' }
  const spent = choiceStillStands(choice, 'b-1')

  assert.equal(spent, undefined)
  assert.equal(channelBeingWatched(spent, 'a-1', 'a-1'), 'a-1')
})

test('a choice made against another url is not read as the answer to this one', () => {
  assert.equal(
    channelBeingWatched({ asked: 'a-1', chosen: 'b-1' }, 'c-1', 'c-1'),
    'c-1',
  )
})

test('the url leads while the page is still answering with where it came from', () => {
  assert.equal(channelBeingWatched(undefined, 'b-1', 'a-1'), 'b-1')
})

test('the page answers for a url that asks for nothing', () => {
  assert.equal(channelBeingWatched(undefined, undefined, 'a-1'), 'a-1')
})

test('while a channel is being watched, some channel always carries the mark', () => {
  const urls = ['a-1', 'b-1', 'c-1']
  const choices = [
    undefined,
    { asked: 'a-1', chosen: 'b-1' },
    { asked: 'b-1', chosen: 'a-1' },
  ]

  for (const asked of urls) {
    for (const choice of choices) {
      assert.notEqual(channelBeingWatched(choice, asked, 'a-1'), undefined)
    }
  }
})

test('watching nothing marks nothing', () => {
  assert.equal(channelBeingWatched(undefined, undefined, undefined), undefined)
})

test('the channel the page answered for is watched as the page answered it', () => {
  const screen = answered(A)

  assert.equal(watchingChosen(screen, A.id, AT), screen.watching)
})

test('a channel chosen before the page has answered is watched at once, from the channels the page already holds', () => {
  const watching = watchingChosen(answered(), B.id, AT)

  assert.equal(watching?.channel, B)
  assert.equal(watching?.progressPct, 17)
  assert.equal(watching?.nowLabel, '21:15')
  assert.equal(watching?.restMin, 25)
})

test('a channel chosen while another is watched takes its place before the page answers', () => {
  assert.equal(watchingChosen(answered(A), B.id, AT)?.channel, B)
})

test('a chosen channel the page does not hold leaves what the page answered', () => {
  const screen = answered(A)

  assert.equal(watchingChosen(screen, '9-9', AT), screen.watching)
  assert.equal(watchingChosen(answered(), '9-9', AT), undefined)
})

test('with nothing chosen and nothing answered, nothing is watched', () => {
  assert.equal(watchingChosen(answered(), undefined, AT), undefined)
})
