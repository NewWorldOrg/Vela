export const SEEK_STEP_SECONDS = 10

export const VOLUME_STEP_PERCENT = 5

export const SEEK_FLASH_LASTS = 700

export type PlayerCommand =
  | 'toggle'
  | 'back'
  | 'forward'
  | 'louder'
  | 'quieter'
  | 'mute'
  | 'fullscreen'
  | 'captions'

export const KEY_CAP: Record<PlayerCommand, string> = {
  toggle: 'Space',
  back: '←',
  forward: '→',
  louder: '↑',
  quieter: '↓',
  mute: 'M',
  fullscreen: 'F',
  captions: 'C',
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
}

const ONLY_ONCE_AIMED = new Set([
  'arrowleft',
  'arrowright',
  'arrowup',
  'arrowdown',
])

export function playerCommand(
  press: {
    key: string
    ctrlKey?: boolean
    metaKey?: boolean
    altKey?: boolean
    target?: unknown
  },
  {
    seeks,
    captions = false,
    aimed = true,
  }: {
    seeks: boolean
    captions?: boolean
    aimed?: boolean
  },
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

  return command
}
