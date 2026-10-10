import { keyFromKeyboard, type BmlKey } from '@/lib/bml/keys'

export const SEEK_STEP_SECONDS = 10

export const VOLUME_STEP_PERCENT = 5

export const SEEK_FLASH_LASTS = 700

export type SeekWay = 'back' | 'forward'

export interface SeekMark {
  way: SeekWay
  seconds: number
  at: number
}

/** The seek mark after one more step: a step the same way while the mark is still up adds to it. */
export function seekMarkAfter(
  last: SeekMark | null,
  way: SeekWay,
  at: number,
): SeekMark {
  const running =
    last !== null && last.way === way && at - last.at < SEEK_FLASH_LASTS

  return {
    way,
    seconds: running ? last.seconds + SEEK_STEP_SECONDS : SEEK_STEP_SECONDS,
    at,
  }
}

export type PlayerCommand =
  | 'toggle'
  | 'back'
  | 'forward'
  | 'louder'
  | 'quieter'
  | 'mute'
  | 'fullscreen'
  | 'captions'
  | 'dataBroadcast'

export const KEY_CAP: Record<PlayerCommand, string> = {
  toggle: 'Space',
  back: '←',
  forward: '→',
  louder: '↑',
  quieter: '↓',
  mute: 'M',
  fullscreen: 'F',
  captions: 'C',
  dataBroadcast: 'D',
}

export interface PressedOn {
  tagName: string
  type?: string
  isContentEditable?: boolean
  role?: string | null
}

export function pressedOn(target: unknown): PressedOn | null {
  const element = target as
    | {
        tagName?: unknown
        type?: unknown
        isContentEditable?: unknown
        getAttribute?: (name: string) => string | null
      }
    | null
    | undefined

  if (!element || typeof element.tagName !== 'string') {
    return null
  }

  return {
    tagName: element.tagName.toLowerCase(),
    type:
      typeof element.type === 'string' ? element.type.toLowerCase() : undefined,
    isContentEditable: element.isContentEditable === true,
    role:
      typeof element.getAttribute === 'function'
        ? element.getAttribute('role')
        : null,
  }
}

const WRITTEN_IN = new Set([
  'text',
  'search',
  'email',
  'url',
  'tel',
  'password',
  'number',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
])

export function typingIn(on: PressedOn | null): boolean {
  if (!on) {
    return false
  }

  if (on.isContentEditable === true) {
    return true
  }

  if (on.tagName === 'textarea' || on.tagName === 'select') {
    return true
  }

  if (on.tagName === 'input') {
    return on.type === undefined || WRITTEN_IN.has(on.type)
  }

  return (
    on.role === 'textbox' || on.role === 'searchbox' || on.role === 'combobox'
  )
}

const ACTIVATED_BY_SPACE = new Set([
  'button',
  'checkbox',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'switch',
  'tab',
])

function isSlider(on: PressedOn): boolean {
  return on.role === 'slider' || (on.tagName === 'input' && on.type === 'range')
}

export function answersItself(on: PressedOn | null, key: string): boolean {
  if (!on) {
    return false
  }

  if (key === ' ' || key === 'Enter') {
    return (
      on.tagName === 'button' ||
      on.tagName === 'a' ||
      on.tagName === 'summary' ||
      ACTIVATED_BY_SPACE.has(on.role ?? '') ||
      isSlider(on)
    )
  }

  return key.startsWith('Arrow') && isSlider(on)
}

const KEYS: Record<string, PlayerCommand> = {
  ' ': 'toggle',
  k: 'toggle',
  arrowleft: 'back',
  arrowright: 'forward',
  j: 'back',
  l: 'forward',
  arrowup: 'louder',
  arrowdown: 'quieter',
  m: 'mute',
  f: 'fullscreen',
  c: 'captions',
  d: 'dataBroadcast',
}

const ONLY_ONCE_AIMED = new Set([
  'arrowleft',
  'arrowright',
  'arrowup',
  'arrowdown',
])

export interface KeyPress {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
  target?: unknown
}

export interface PlayerKeysOffered {
  seeks: boolean
  captions?: boolean
  dataBroadcast?: boolean
  aimed?: boolean
}

export function playerCommand(
  press: KeyPress,
  {
    seeks,
    captions = false,
    dataBroadcast = false,
    aimed = true,
  }: PlayerKeysOffered,
): PlayerCommand | null {
  if (
    press.ctrlKey === true ||
    press.metaKey === true ||
    press.altKey === true
  ) {
    return null
  }

  const on = pressedOn(press.target)

  if (typingIn(on)) {
    return null
  }

  const key = press.key.toLowerCase()
  const command = KEYS[key]

  if (command === undefined || answersItself(on, press.key)) {
    return null
  }

  if (!aimed && ONLY_ONCE_AIMED.has(key)) {
    return null
  }

  if (!seeks && (command === 'back' || command === 'forward')) {
    return null
  }

  if (!captions && command === 'captions') {
    return null
  }

  if (!dataBroadcast && command === 'dataBroadcast') {
    return null
  }

  return command
}

/** What a data broadcast takes from the keyboard while it is open: the keys its document uses. */
export interface OpenBroadcast {
  usedKeys: readonly BmlKey[]
}

export type KeyRoute =
  | { to: 'player'; command: PlayerCommand }
  | { to: 'dataBroadcast'; key: BmlKey }

const ARROWS = new Set<BmlKey>(['up', 'down', 'left', 'right'])

/** Where a key goes: to an open data broadcast when its document uses it, or else to the player as before. Arrows do not seek or change the volume while a broadcast is open, whether its document uses them or not. */
export function routeKey(
  press: KeyPress,
  offered: PlayerKeysOffered,
  broadcast: OpenBroadcast | null,
): KeyRoute | null {
  const key = broadcast ? keyFromKeyboard(press) : null

  if (broadcast && key !== null && key !== 'd') {
    const on = pressedOn(press.target)

    if (typingIn(on) || answersItself(on, press.key)) {
      return null
    }

    if (broadcast.usedKeys.includes(key)) {
      return { to: 'dataBroadcast', key }
    }

    if (ARROWS.has(key)) {
      return null
    }
  }

  const command = playerCommand(press, offered)

  return command ? { to: 'player', command } : null
}
