import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  answersItself,
  KEY_CAP,
  playerCommand,
  pressedOn,
  routeKey,
  SEEK_FLASH_LASTS,
  SEEK_STEP_SECONDS,
  seekMarkAfter,
  typingIn,
  type OpenBroadcast,
  type PlayerCommand,
  type SeekMark,
  type SeekWay,
} from '@/lib/player-keys'

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
  D: 'd',
}

test('every cap a bubble prints is a key the player really takes', () => {
  for (const [command, cap] of Object.entries(KEY_CAP)) {
    const key = PRESSED[cap]

    assert.ok(key !== undefined, `${cap} is not a key anybody could press`)
    assert.equal(
      playerCommand(
        { key, target: THE_PLAYER },
        { seeks: true, captions: true, dataBroadcast: true },
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
    'dataBroadcast',
  ]

  assert.deepEqual(Object.keys(KEY_CAP).sort(), [...COMMANDS].sort())
  assert.equal(new Set(Object.values(KEY_CAP)).size, COMMANDS.length)
})

function stepping(steps: [SeekWay, number][]): number[] {
  let mark: SeekMark | null = null

  return steps.map(([way, at]) => {
    mark = seekMarkAfter(mark, way, at)

    return mark.seconds
  })
}

test('the first step puts one step on the seek mark', () => {
  assert.deepEqual(seekMarkAfter(null, 'forward', 5000), {
    way: 'forward',
    seconds: SEEK_STEP_SECONDS,
    at: 5000,
  })
})

test('steps the same way while the mark is up add to it', () => {
  assert.deepEqual(
    stepping([
      ['forward', 1000],
      ['forward', 1000 + SEEK_FLASH_LASTS - 1],
      ['forward', 1000 + 2 * (SEEK_FLASH_LASTS - 1)],
    ]),
    [SEEK_STEP_SECONDS, 2 * SEEK_STEP_SECONDS, 3 * SEEK_STEP_SECONDS],
  )
})

test('a step after the mark has gone starts the count again', () => {
  assert.deepEqual(
    stepping([
      ['back', 1000],
      ['back', 1000 + SEEK_FLASH_LASTS],
    ]),
    [SEEK_STEP_SECONDS, SEEK_STEP_SECONDS],
  )
})

test('a step the other way starts the count again', () => {
  assert.deepEqual(
    stepping([
      ['forward', 1000],
      ['forward', 1100],
      ['back', 1200],
      ['back', 1300],
    ]),
    [
      SEEK_STEP_SECONDS,
      2 * SEEK_STEP_SECONDS,
      SEEK_STEP_SECONDS,
      2 * SEEK_STEP_SECONDS,
    ],
  )
})

const LIVE = { seeks: false, captions: true, dataBroadcast: true }

const EVERY_KEY: OpenBroadcast = {
  usedKeys: [
    'up',
    'down',
    'left',
    'right',
    'enter',
    'back',
    'd',
    'blue',
    'red',
    'green',
    'yellow',
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
  ],
}

function routed(
  key: string,
  broadcast: OpenBroadcast | null,
  target: unknown = THE_PLAYER,
) {
  return routeKey({ key, target }, LIVE, broadcast)
}

test('while a broadcast is open, the keys of the remote control go to its document', () => {
  for (const [key, meant] of [
    ['ArrowUp', 'up'],
    ['ArrowDown', 'down'],
    ['ArrowLeft', 'left'],
    ['ArrowRight', 'right'],
    ['Enter', 'enter'],
    ['Backspace', 'back'],
    ['b', 'blue'],
    ['R', 'red'],
    ['g', 'green'],
    ['y', 'yellow'],
    ['0', '0'],
    ['7', '7'],
  ]) {
    assert.deepEqual(routed(key, EVERY_KEY), {
      to: 'dataBroadcast',
      key: meant,
    })
  }
})

test('while a broadcast is open, the player keeps its own keys', () => {
  assert.deepEqual(routed(' ', EVERY_KEY), { to: 'player', command: 'toggle' })
  assert.deepEqual(routed('k', EVERY_KEY), { to: 'player', command: 'toggle' })
  assert.deepEqual(routed('m', EVERY_KEY), { to: 'player', command: 'mute' })
  assert.deepEqual(routed('f', EVERY_KEY), {
    to: 'player',
    command: 'fullscreen',
  })
  assert.deepEqual(routed('c', EVERY_KEY), {
    to: 'player',
    command: 'captions',
  })
  assert.deepEqual(routed('d', EVERY_KEY), {
    to: 'player',
    command: 'dataBroadcast',
  })
  assert.equal(routed('Escape', EVERY_KEY), null)
})

test('a recording still seeks with J and L while a broadcast is open', () => {
  assert.deepEqual(
    routeKey({ key: 'j', target: THE_PLAYER }, { seeks: true }, EVERY_KEY),
    { to: 'player', command: 'back' },
  )
  assert.deepEqual(
    routeKey({ key: 'l', target: THE_PLAYER }, { seeks: true }, EVERY_KEY),
    { to: 'player', command: 'forward' },
  )
})

test('a key the document says it does not use goes to the player, but an arrow neither seeks nor changes the volume', () => {
  const basicOnly: OpenBroadcast = {
    usedKeys: ['up', 'down', 'left', 'right', 'enter', 'back', 'd'],
  }
  const noArrows: OpenBroadcast = { usedKeys: ['enter', 'back'] }

  assert.equal(routed('b', basicOnly), null)
  assert.equal(routed('5', basicOnly), null)
  assert.deepEqual(routed('ArrowUp', noArrows), { to: 'nowhere' })
  assert.deepEqual(routed('ArrowDown', noArrows), { to: 'nowhere' })
  assert.deepEqual(
    routeKey(
      { key: 'ArrowLeft', target: THE_PLAYER },
      { seeks: true },
      noArrows,
    ),
    { to: 'nowhere' },
  )
  assert.deepEqual(routed('Enter', noArrows), {
    to: 'dataBroadcast',
    key: 'enter',
  })
})

test('while a broadcast is closed, its keys belong to the player as before', () => {
  assert.deepEqual(routed('ArrowUp', null), { to: 'player', command: 'louder' })
  assert.deepEqual(routed('ArrowDown', null), {
    to: 'player',
    command: 'quieter',
  })
  assert.equal(routed('ArrowLeft', null), null)
  assert.equal(routed('Enter', null), null)
  assert.equal(routed('b', null), null)
  assert.deepEqual(routed('d', null), {
    to: 'player',
    command: 'dataBroadcast',
  })
})

test('D is not taken while there is no broadcast to open', () => {
  assert.equal(
    routeKey(
      { key: 'd', target: THE_PLAYER },
      { seeks: false, captions: true },
      null,
    ),
    null,
  )
})

test('Enter and Space on a focused button press that button, not the document', () => {
  const button = element('BUTTON')

  assert.equal(routed('Enter', EVERY_KEY, button), null)
  assert.equal(routed(' ', EVERY_KEY, button), null)
  assert.deepEqual(routed('ArrowUp', EVERY_KEY, button), {
    to: 'dataBroadcast',
    key: 'up',
  })
})

test('nothing is taken while typing, or with Ctrl, Meta or Alt held', () => {
  assert.equal(
    routed('ArrowUp', EVERY_KEY, element('INPUT', { type: 'text' })),
    null,
  )
  assert.equal(
    routeKey({ key: 'b', ctrlKey: true, target: THE_PLAYER }, LIVE, EVERY_KEY),
    null,
  )
  assert.equal(
    routeKey({ key: 'r', metaKey: true, target: THE_PLAYER }, LIVE, EVERY_KEY),
    null,
  )
  assert.equal(
    routeKey({ key: '1', altKey: true, target: THE_PLAYER }, LIVE, EVERY_KEY),
    null,
  )
})

test('an arrow goes to the document only once the player has been aimed at, as it goes to the player', () => {
  const unaimed = { ...LIVE, aimed: false }

  assert.equal(
    routeKey({ key: 'ArrowDown', target: THE_PLAYER }, unaimed, EVERY_KEY),
    null,
  )
  assert.equal(
    routeKey({ key: 'ArrowUp', target: THE_PLAYER }, unaimed, {
      usedKeys: ['enter'],
    }),
    null,
  )
  assert.deepEqual(
    routeKey({ key: 'Enter', target: THE_PLAYER }, unaimed, EVERY_KEY),
    { to: 'dataBroadcast', key: 'enter' },
  )
  assert.deepEqual(
    routeKey({ key: 'ArrowDown', target: THE_PLAYER }, LIVE, EVERY_KEY),
    { to: 'dataBroadcast', key: 'down' },
  )
})
