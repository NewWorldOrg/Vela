import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  answersItself,
  KEY_CAP,
  playerCommand,
  pressedOn,
  typingIn,
  type PlayerCommand,
} from '@/lib/player-keys'

/** An element as a press sees it, without a document to make one in. */
function element(
  tagName: string,
  {
    type,
    role,
    editable,
  }: { type?: string; role?: string; editable?: boolean } = {},
) {
  return {
    tagName,
    type,
    isContentEditable: editable === true,
    getAttribute: (name: string) => (name === 'role' ? (role ?? null) : null),
  }
}

/** The player itself: what a press lands on once the picture has been clicked. */
const THE_PLAYER = element('SECTION')

function meaning(key: string, seeks = true): PlayerCommand | null {
  return playerCommand({ key, target: THE_PLAYER }, { seeks })
}

test('the recording player answers the keys every player answers', () => {
  assert.deepEqual(
    [
      ' ',
      'k',
      'K',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'm',
      'f',
    ].map((key) => meaning(key)),
    [
      'toggle',
      'toggle',
      'toggle',
      'back',
      'forward',
      'louder',
      'quieter',
      'mute',
      'fullscreen',
    ],
  )
})

test('Escape is left to the browser, which is what leaves full screen', () => {
  assert.equal(meaning('Escape'), null)
})

test('live has no back and no forward: the only picture there is, is the edge', () => {
  assert.equal(meaning('ArrowLeft', false), null)
  assert.equal(meaning('ArrowRight', false), null)
})

test('live still answers everything that is not a position', () => {
  assert.deepEqual(
    [' ', 'ArrowUp', 'ArrowDown', 'm', 'f'].map((key) => meaning(key, false)),
    ['toggle', 'louder', 'quieter', 'mute', 'fullscreen'],
  )
})

test('a key held with a modifier belongs to the browser', () => {
  assert.equal(
    playerCommand(
      { key: 'f', ctrlKey: true, target: THE_PLAYER },
      { seeks: true },
    ),
    null,
  )
  assert.equal(
    playerCommand(
      { key: ' ', metaKey: true, target: THE_PLAYER },
      { seeks: true },
    ),
    null,
  )
  assert.equal(
    playerCommand(
      { key: 'ArrowRight', altKey: true, target: THE_PLAYER },
      { seeks: true },
    ),
    null,
  )
})

test('nothing is taken while something is being written', () => {
  for (const on of [
    element('INPUT', { type: 'text' }),
    element('INPUT'),
    element('INPUT', { type: 'search' }),
    element('TEXTAREA'),
    element('SELECT'),
    element('DIV', { editable: true }),
    element('DIV', { role: 'textbox' }),
    element('DIV', { role: 'combobox' }),
  ]) {
    for (const key of [' ', 'k', 'm', 'f', 'ArrowLeft', 'ArrowUp']) {
      assert.equal(
        playerCommand({ key, target: on }, { seeks: true }),
        null,
        `${key} on ${on.tagName}${on.type ? `[${on.type}]` : ''}`,
      )
    }
  }
})

test('a range is moved, not written in, so it keeps only the keys it answers', () => {
  const volume = element('INPUT', { type: 'range' })

  assert.equal(
    playerCommand({ key: 'ArrowUp', target: volume }, { seeks: true }),
    null,
  )
  assert.equal(
    playerCommand({ key: 'f', target: volume }, { seeks: true }),
    'fullscreen',
  )
})

test('space on a control on the bar presses that control and nothing else', () => {
  for (const on of [
    element('BUTTON'),
    element('A'),
    element('DIV', { role: 'button' }),
    element('DIV', { role: 'slider' }),
  ]) {
    assert.equal(playerCommand({ key: ' ', target: on }, { seeks: true }), null)
  }
})

test('a letter still reaches the player while a button on the bar has the focus', () => {
  const button = element('BUTTON')

  assert.deepEqual(
    ['k', 'm', 'f'].map((key) =>
      playerCommand({ key, target: button }, { seeks: true }),
    ),
    ['toggle', 'mute', 'fullscreen'],
  )
})

test('an arrow on the seek bar belongs to the seek bar, so the position is not moved twice', () => {
  const seek = element('DIV', { role: 'slider' })

  assert.equal(
    playerCommand({ key: 'ArrowLeft', target: seek }, { seeks: true }),
    null,
  )
  assert.equal(
    playerCommand({ key: 'ArrowRight', target: seek }, { seeks: true }),
    null,
  )
})

test('a target that is not an element is nobody, and the player takes the press', () => {
  assert.equal(pressedOn(null), null)
  assert.equal(pressedOn({}), null)
  assert.equal(typingIn(null), false)
  assert.equal(answersItself(null, ' '), false)
  assert.equal(playerCommand({ key: ' ' }, { seeks: true }), 'toggle')
})

test('J and L move the same way the arrows and the two buttons do', () => {
  assert.equal(playerCommand({ key: 'j' }, { seeks: true }), 'back')
  assert.equal(playerCommand({ key: 'l' }, { seeks: true }), 'forward')
  assert.equal(playerCommand({ key: 'J' }, { seeks: true }), 'back')
  // Live has no position to move along, so neither is taken there.
  assert.equal(playerCommand({ key: 'j' }, { seeks: false }), null)
  assert.equal(playerCommand({ key: 'l' }, { seeks: false }), null)
})

test('C is only taken where a caption switch exists to press', () => {
  assert.equal(
    playerCommand({ key: 'c' }, { seeks: false, captions: true }),
    'captions',
  )
  assert.equal(playerCommand({ key: 'c' }, { seeks: true }), null)
})

const PRESSED: Record<string, string> = {
  Space: ' ',
  '←': 'ArrowLeft',
  '→': 'ArrowRight',
  '↑': 'ArrowUp',
  '↓': 'ArrowDown',
  M: 'm',
  F: 'f',
  C: 'c',
}

test('every cap a bubble prints is a key the player really takes', () => {
  for (const [command, cap] of Object.entries(KEY_CAP)) {
    const key = PRESSED[cap]

    assert.ok(key !== undefined, `${cap} is not a key anybody could press`)
    assert.equal(
      playerCommand(
        { key, target: THE_PLAYER },
        { seeks: true, captions: true },
      ),
      command,
      `${cap} does not call ${command}`,
    )
  }
})

test('a command with no cap would print nothing, so every one has one', () => {
  const COMMANDS: PlayerCommand[] = [
    'toggle',
    'back',
    'forward',
    'louder',
    'quieter',
    'mute',
    'fullscreen',
    'captions',
  ]

  assert.deepEqual(Object.keys(KEY_CAP).sort(), [...COMMANDS].sort())
  assert.equal(new Set(Object.values(KEY_CAP)).size, COMMANDS.length)
})
