import assert from 'node:assert/strict'
import { test } from 'node:test'

import { channelInFull } from '@/lib/live-in-full'
import {
  LIVE_LONG_WORDS_FIXTURE,
  LONG_DESCRIPTION,
  LONG_TITLE,
} from '@/repository/live.fixtures'

const LAST_WORDS_OF_THE_TITLE = '長い夜」'

const LAST_WORDS_OF_THE_DESCRIPTION = '夜明けまで見届ける。'

const ROUNDED_OFF = /…|\.\.\./

test('the tip carries the whole of what the tile clips', () => {
  const channel = LIVE_LONG_WORDS_FIXTURE.channels[0]
  const said = channelInFull(channel)

  assert.equal(said.name, channel.name)
  assert.equal(said.now, LONG_TITLE)
  assert.equal(said.description, LONG_DESCRIPTION)

  assert.ok(
    said.now?.endsWith(LAST_WORDS_OF_THE_TITLE),
    'The title stops before its last words, so the tip repeats the clipping ' +
      'it is there to undo.',
  )
  assert.ok(
    said.description?.endsWith(LAST_WORDS_OF_THE_DESCRIPTION),
    'The description stops before its last words.',
  )
  assert.doesNotMatch(
    `${said.now} ${said.description}`,
    ROUNDED_OFF,
    'The tip rounds the text off with an ellipsis of its own.',
  )
})

test('the tip carries what comes next whole', () => {
  const channel = LIVE_LONG_WORDS_FIXTURE.channels[0]
  const said = channelInFull(channel)

  assert.deepEqual(said.next, {
    at: channel.next?.startLabel,
    title: channel.next?.title,
  })
  assert.doesNotMatch(`${said.next?.title}`, ROUNDED_OFF)
})

test('a channel with nothing on says only its name', () => {
  const quiet = LIVE_LONG_WORDS_FIXTURE.channels.filter(
    (one) => one.now === undefined,
  )

  assert.ok(
    quiet.length > 0,
    'the fixtures no longer hold a channel with nothing on',
  )

  for (const one of quiet) {
    const said = channelInFull(one)

    assert.equal(said.name, one.name)
    assert.equal(said.now, undefined)
    assert.equal(said.description, undefined)
  }
})
