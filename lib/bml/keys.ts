import type { NavLinks, PageElement, PageNode } from '@/lib/bml/document'
import type { UsedKeyGroup } from '@/lib/bml/style'

export const BML_KEYS = [
  'up',
  'down',
  'left',
  'right',
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
  'enter',
  'back',
  'd',
  'blue',
  'red',
  'green',
  'yellow',
] as const

export type BmlKey = (typeof BML_KEYS)[number]

/** The key codes a document reads from a key event, by the remote control's key. */
export const BML_KEY_CODE: Record<BmlKey, number> = {
  up: 1,
  down: 2,
  left: 3,
  right: 4,
  '0': 5,
  '1': 6,
  '2': 7,
  '3': 8,
  '4': 9,
  '5': 10,
  '6': 11,
  '7': 12,
  '8': 13,
  '9': 14,
  enter: 18,
  back: 19,
  d: 20,
  blue: 21,
  red: 22,
  green: 23,
  yellow: 24,
}

const DIGITS: BmlKey[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export const KEY_GROUP: Record<UsedKeyGroup, BmlKey[]> = {
  basic: ['up', 'down', 'left', 'right', 'enter', 'back', 'd'],
  'data-button': ['blue', 'red', 'green', 'yellow'],
  'numeric-tuning': DIGITS,
}

/** The keys a document takes, in the order of the remote control. */
export function keysOf(groups: UsedKeyGroup[]): BmlKey[] {
  const taken = new Set(groups.flatMap((group) => KEY_GROUP[group]))

  return BML_KEYS.filter((key) => taken.has(key))
}

const KEYBOARD: Record<string, BmlKey> = {
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  enter: 'enter',
  backspace: 'back',
  b: 'blue',
  r: 'red',
  g: 'green',
  y: 'yellow',
  d: 'd',
  ...Object.fromEntries(DIGITS.map((digit) => [digit, digit])),
}

/** The remote control's key a key on the keyboard stands for, or null. A key held with Ctrl, Meta or Alt is the browser's. */
export function keyFromKeyboard(press: {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
}): BmlKey | null {
  if (
    press.ctrlKey === true ||
    press.metaKey === true ||
    press.altKey === true
  ) {
    return null
  }

  return KEYBOARD[press.key.toLowerCase()] ?? null
}

export function isBmlKey(value: unknown): value is BmlKey {
  return (
    typeof value === 'string' && (BML_KEYS as readonly string[]).includes(value)
  )
}

export type Navigation = Map<number, NavLinks>

function walk(node: PageNode, into: Navigation): void {
  if (node.kind !== 'element') {
    return
  }

  const index = node.nav.index

  if (index !== undefined && !into.has(index)) {
    into.set(index, node.nav)
  }

  node.children.forEach((child) => walk(child, into))
}

/** Every element a document lets the focus land on, by its `nav-index`. The first of two with the same index wins. */
export function navigationOf(body: PageElement): Navigation {
  const navigation: Navigation = new Map()

  walk(body, navigation)

  return navigation
}

/** Where the focus starts when a document opens: the lowest `nav-index`. */
export function firstFocus(navigation: Navigation): number | null {
  const indices = [...navigation.keys()]

  return indices.length > 0 ? Math.min(...indices) : null
}

const WAY: Partial<Record<BmlKey, 'up' | 'down' | 'left' | 'right'>> = {
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
}

export type KeyAnswer =
  | { answer: 'moved'; from: number | null; to: number }
  | { answer: 'stayed' }
  | { answer: 'decided'; on: number }
  | { answer: 'pressed'; code: number }

/** What a key does to the focus: an arrow moves it where the focused element's `nav-*` says, or nowhere when it says nothing; Enter decides on it; any other key is handed to the document. */
export function answerTo(
  key: BmlKey,
  navigation: Navigation,
  focused: number | null,
): KeyAnswer {
  const way = WAY[key]

  if (way) {
    const target = focused === null ? undefined : navigation.get(focused)?.[way]

    return target !== undefined && target !== focused && navigation.has(target)
      ? { answer: 'moved', from: focused, to: target }
      : { answer: 'stayed' }
  }

  if (key === 'enter' && focused !== null && navigation.has(focused)) {
    return { answer: 'decided', on: focused }
  }

  return { answer: 'pressed', code: BML_KEY_CODE[key] }
}
