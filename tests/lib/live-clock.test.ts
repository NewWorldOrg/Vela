import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  nextProgrammeChangeAt,
  progressOf,
  screenAsOf,
  watchingOf,
} from '@/lib/live-clock'
import type { LiveChannel, LiveProgramme, LiveScreen } from '@/repository/live'

const NOW = new Date('2026-08-08T12:04:00Z')

function programme(
  start: string,
  end: string | undefined,
  over: Partial<LiveProgramme> = {},
): LiveProgramme {
  return {
    id: `p${start}`,
    title: 'x',
    startsAt: `2026-08-08T${start}:00+09:00`,
    endsAt: end === undefined ? undefined : `2026-08-08T${end}:00+09:00`,
    startLabel: start,
    endLabel: end,
    hasSubtitles: false,
    sounds: 1,
    genreLabel: 'その他',
    ...over,
  }
}

function channel(id: string, over: Partial<LiveChannel> = {}): LiveChannel {
  return {
    id,
    networkId: 1,
    serviceId: Number(id.split('-')[1] ?? 1),
    name: id,
    kind: 'terrestrial',
    viewers: 0,
    ...over,
  }
}

function screenOf(channels: LiveChannel[], watched?: LiveChannel): LiveScreen {
  return {
    kind: 'terrestrial',
    kinds: ['terrestrial'],
    channels,
    watching: watched && watchingOf(watched, NOW),
    profiles: [],
    tuners: 1,
  }
}

test('the share of a programme already gone by grows with the clock', () => {
  const one = programme('21:00', '22:00')

  assert.equal(progressOf(one, new Date('2026-08-08T12:00:00Z')), 0)
  assert.equal(progressOf(one, NOW), 7)
  assert.equal(progressOf(one, new Date('2026-08-08T12:30:00Z')), 50)
  assert.equal(progressOf(one, new Date('2026-08-08T12:50:00Z')), 83)
})

test('the share is held between nought and the whole, before the start and after the end', () => {
  const one = programme('21:00', '22:00')

  assert.equal(progressOf(one, new Date('2026-08-08T11:00:00Z')), 0)
  assert.equal(progressOf(one, new Date('2026-08-08T14:00:00Z')), 100)
})

test('a programme with no end, and no programme at all, stand at nought', () => {
  assert.equal(progressOf(programme('20:50', undefined), NOW), 0)
  assert.equal(progressOf(undefined, NOW), 0)
})

test('a programme that ends where it starts stands at nought rather than dividing by nothing', () => {
  assert.equal(progressOf(programme('21:00', '21:00'), NOW), 0)
})

test('what is being watched says the time now, the share gone by, and the minutes left', () => {
  const watched = channel('1-1', { now: programme('21:00', '22:00') })

  assert.deepEqual(watchingOf(watched, NOW), {
    channel: watched,
    progressPct: 7,
    nowLabel: '21:04',
    restMin: 56,
  })

  assert.deepEqual(watchingOf(watched, new Date('2026-08-08T12:50:00Z')), {
    channel: watched,
    progressPct: 83,
    nowLabel: '21:50',
    restMin: 10,
  })
})

test('a channel with no programme known stands at nought, and one with no end has no remainder', () => {
  const bare = channel('1-1')

  assert.deepEqual(watchingOf(bare, NOW), {
    channel: bare,
    progressPct: 0,
    nowLabel: '21:04',
  })

  const undecided = channel('1-1', { now: programme('20:50', undefined) })

  assert.equal(watchingOf(undecided, NOW).restMin, undefined)
  assert.equal(watchingOf(undecided, NOW).progressPct, 0)
})

test('the minutes left never fall below nought once the end has gone by', () => {
  const over = channel('1-1', { now: programme('21:00', '22:00') })

  assert.equal(watchingOf(over, new Date('2026-08-08T14:00:00Z')).restMin, 0)
})

test('reading the screen again at a later hour moves every gauge on it', () => {
  const screen = screenOf(
    [
      channel('1-1', { now: programme('21:00', '22:00'), progressPct: 7 }),
      channel('1-2', { now: programme('20:30', '22:00'), progressPct: 38 }),
    ],
    channel('1-1', { now: programme('21:00', '22:00') }),
  )

  const later = screenAsOf(screen, new Date('2026-08-08T12:50:00Z'))

  assert.deepEqual(
    later.channels.map((one) => one.progressPct),
    [83, 89],
  )
  assert.equal(later.watching?.progressPct, 83)
  assert.equal(later.watching?.nowLabel, '21:50')
  assert.equal(later.watching?.restMin, 10)
})

test('reading the screen again leaves everything the clock does not decide alone', () => {
  const screen = screenOf([
    channel('1-1', { now: programme('21:00', '22:00') }),
  ])
  const later = screenAsOf(screen, new Date('2026-08-08T12:50:00Z'))

  assert.equal(later.kind, screen.kind)
  assert.deepEqual(later.kinds, screen.kinds)
  assert.deepEqual(later.profiles, screen.profiles)
  assert.equal(later.tuners, screen.tuners)
  assert.deepEqual(
    later.channels.map((one) => [one.id, one.name, one.now?.title]),
    screen.channels.map((one) => [one.id, one.name, one.now?.title]),
  )
})

test('a screen with no channels, and one with nothing being watched, come back whole', () => {
  const empty = screenAsOf(screenOf([]), NOW)

  assert.deepEqual(empty.channels, [])
  assert.equal(empty.watching, undefined)

  const unchosen = screenAsOf(
    screenOf([channel('1-1', { now: programme('21:00', '22:00') })]),
    NOW,
  )

  assert.equal(unchosen.watching, undefined)
  assert.equal(unchosen.channels[0].progressPct, 7)
})

test('a channel with no programme is carried through the reading untouched', () => {
  const read = screenAsOf(screenOf([channel('1-9')]), NOW)

  assert.equal(read.channels[0].now, undefined)
  assert.equal(read.channels[0].progressPct, 0)
})

test('the screen is read again when the earliest programme still running ends', () => {
  const screen = screenOf([
    channel('1-1', { now: programme('21:00', '22:00') }),
    channel('1-2', { now: programme('20:55', '21:25') }),
  ])

  assert.equal(
    nextProgrammeChangeAt(screen, NOW),
    Date.parse('2026-08-08T21:25:00+09:00'),
  )
})

test('an end already gone by is not asked for again, so a stale guide is not read in a loop', () => {
  const screen = screenOf([
    channel('1-1', { now: programme('19:00', '20:00') }),
    channel('1-2', { now: programme('21:00', '22:00') }),
  ])

  assert.equal(
    nextProgrammeChangeAt(screen, NOW),
    Date.parse('2026-08-08T22:00:00+09:00'),
  )
})

test('a channel showing nothing is read again when the programme it names next begins', () => {
  const screen = screenOf([
    channel('1-1', { next: programme('21:10', '21:40') }),
    channel('1-2', { now: programme('21:00', '22:00') }),
  ])

  assert.equal(
    nextProgrammeChangeAt(screen, NOW),
    Date.parse('2026-08-08T21:10:00+09:00'),
  )
})

test('the channel being watched counts even when the list is showing another kind', () => {
  const screen = screenOf(
    [channel('1-1', { now: programme('21:00', '22:00') })],
    channel('4-1', { now: programme('21:00', '21:15') }),
  )

  assert.equal(
    nextProgrammeChangeAt(screen, NOW),
    Date.parse('2026-08-08T21:15:00+09:00'),
  )
})

test('nothing still to come asks for no further reading', () => {
  assert.equal(nextProgrammeChangeAt(screenOf([]), NOW), undefined)
  assert.equal(
    nextProgrammeChangeAt(screenOf([channel('1-9')]), NOW),
    undefined,
  )
  assert.equal(
    nextProgrammeChangeAt(
      screenOf([channel('1-1', { now: programme('20:00', undefined) })]),
      NOW,
    ),
    undefined,
  )
})

test('a start already gone by is not asked for again either', () => {
  const screen = screenOf([
    channel('1-1', {
      now: programme('19:00', '20:00'),
      next: programme('20:00', '20:30'),
    }),
    channel('1-2', { now: programme('21:00', '22:00') }),
  ])

  assert.equal(
    nextProgrammeChangeAt(screen, NOW),
    Date.parse('2026-08-08T22:00:00+09:00'),
  )
})

test('a mark that is exactly now has already arrived, so the one after it is asked for', () => {
  const screen = screenOf([
    channel('1-1', { now: programme('20:34', '21:04') }),
    channel('1-2', { now: programme('20:00', '21:30') }),
  ])

  assert.equal(
    nextProgrammeChangeAt(screen, NOW),
    Date.parse('2026-08-08T21:30:00+09:00'),
  )
})

test('a mark that is exactly now on the only channel there is asks for nothing', () => {
  assert.equal(
    nextProgrammeChangeAt(
      screenOf([channel('1-1', { now: programme('20:34', '21:04') })]),
      NOW,
    ),
    undefined,
  )
})

test('the counts read again on their own land on the channels and on the one being watched', () => {
  const screen = screenOf(
    [channel('1-1', { now: programme('21:00', '22:00'), viewers: 0 })],
    channel('4-1', { now: programme('21:00', '22:00'), viewers: 0 }),
  )

  const counted = screenAsOf(screen, NOW, { '1-1': 3, '4-1': 5 })

  assert.equal(counted.channels[0].viewers, 3)
  assert.equal(counted.watching?.channel.viewers, 5)
})

test('a channel the light read did not mention keeps the count the page was drawn with', () => {
  const screen = screenOf([
    channel('1-1', { now: programme('21:00', '22:00'), viewers: 2 }),
  ])

  assert.equal(screenAsOf(screen, NOW, { '9-9': 7 }).channels[0].viewers, 2)
  assert.equal(screenAsOf(screen, NOW).channels[0].viewers, 2)
})
