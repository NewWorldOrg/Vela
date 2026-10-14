import { BML_KEYS, type BmlKey } from '@/lib/bml/keys'

/** The key codes an application compares a `keydown`'s `which` with, by the remote control's key, given to it as the `VK_*` globals. The codes are this receiver's own: those of the keyboard for the arrows, Enter and the digits, those television engines commonly give the colours and Back, and one of its own for d. */
export const APP_KEY_CODE: Record<BmlKey, number> = {
  up: 38,
  down: 40,
  left: 37,
  right: 39,
  '0': 48,
  '1': 49,
  '2': 50,
  '3': 51,
  '4': 52,
  '5': 53,
  '6': 54,
  '7': 55,
  '8': 56,
  '9': 57,
  enter: 13,
  back: 461,
  d: 496,
  red: 403,
  green: 404,
  yellow: 405,
  blue: 406,
}

const GLOBAL_NAME: Record<BmlKey, string> = {
  up: 'VK_UP',
  down: 'VK_DOWN',
  left: 'VK_LEFT',
  right: 'VK_RIGHT',
  '0': 'VK_0',
  '1': 'VK_1',
  '2': 'VK_2',
  '3': 'VK_3',
  '4': 'VK_4',
  '5': 'VK_5',
  '6': 'VK_6',
  '7': 'VK_7',
  '8': 'VK_8',
  '9': 'VK_9',
  enter: 'VK_ENTER',
  back: 'VK_BACK',
  d: 'VK_DBUTTON',
  red: 'VK_RED',
  green: 'VK_GREEN',
  yellow: 'VK_YELLOW',
  blue: 'VK_BLUE',
}

/** The `VK_*` globals an application's window is given. */
export function keyGlobals(): [string, number][] {
  return BML_KEYS.map((key) => [GLOBAL_NAME[key], APP_KEY_CODE[key]])
}

/** The groups of keys an application asks for with `keySet.setValue`, as the constants of its key set. */
export const KEY_SET = {
  RED: 0x1,
  GREEN: 0x2,
  YELLOW: 0x4,
  BLUE: 0x8,
  NAVIGATION: 0x10,
  VCR: 0x20,
  NUMERIC: 0x100,
  DBUTTON: 0x800,
} as const

const KNOWN = Object.values(KEY_SET).reduce((all, bit) => all | bit, 0)

/** The groups an application has until it says otherwise: every one this remote has keys for but d, which closes the application until it asks for it. */
export const KEY_SET_UNTIL_TOLD =
  KEY_SET.RED |
  KEY_SET.GREEN |
  KEY_SET.YELLOW |
  KEY_SET.BLUE |
  KEY_SET.NAVIGATION |
  KEY_SET.NUMERIC

const DIGITS: BmlKey[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

const KEYS_OF_GROUP: [number, BmlKey[]][] = [
  [KEY_SET.RED, ['red']],
  [KEY_SET.GREEN, ['green']],
  [KEY_SET.YELLOW, ['yellow']],
  [KEY_SET.BLUE, ['blue']],
  [KEY_SET.NAVIGATION, ['up', 'down', 'left', 'right', 'enter', 'back']],
  [KEY_SET.NUMERIC, DIGITS],
  [KEY_SET.DBUTTON, ['d']],
]

/** The remote's keys an application's key set takes, in the remote's order. VCR names keys this remote does not have. */
export function keysOfKeySet(mask: number): BmlKey[] {
  const taken = new Set(
    KEYS_OF_GROUP.flatMap(([group, keys]) =>
      (mask & group) !== 0 ? keys : [],
    ),
  )

  return BML_KEYS.filter((key) => taken.has(key))
}

/** A key set as an application writes it, kept to the groups there are, or null when it is not a number. */
export function keySetOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value & KNOWN
    : null
}
