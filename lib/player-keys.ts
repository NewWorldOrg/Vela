/**
 * What the hand and the keyboard say to a player.
 *
 * The assignments are the ones every player anyone has used already has —
 * YouTube, Netflix, VLC, QuickTime all answer space, the arrows, M and F the
 * same way — so nothing here is an invention. The mapping is kept apart from
 * both players because both answer it, and because who owns a press is a
 * question about the element under it rather than about video.
 */

/**
 * What a press moves the position by, and what the two skip buttons on the bar
 * are drawn with.
 *
 * Ten, because the buttons say ten. Netflix's bar carries a ⏪10 and a ⏩10 and
 * its arrows move by the same ten; a button that reads 10 beside an arrow that
 * moves 5 is the player disagreeing with itself, and the number is written on
 * the button where anyone can check it.
 */
export const SEEK_STEP_SECONDS = 10

/** What a press moves the level by, on the 0-100 scale the bar reads in. */
export const VOLUME_STEP_PERCENT = 5

export type PlayerCommand =
  'toggle' | 'back' | 'forward' | 'louder' | 'quieter' | 'mute' | 'fullscreen'

/** Just enough of the element a press landed on to say who answers it. */
export interface PressedOn {
  tagName: string
  type?: string
  isContentEditable?: boolean
  role?: string | null
}

/**
 * Read a press's target without reaching for the DOM's own types, so the rules
 * below can be read by a test that has no document.
 */
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

/** The `<input>` types a press is a letter being written into. */
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

/**
 * Whether the press is the reader writing rather than the reader watching.
 *
 * A player that took the keys wherever they were pressed would answer the
 * space in a search term and the arrows in a name being edited. The keys are
 * the player's only where nothing is being written.
 */
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

function isSlider(on: PressedOn): boolean {
  return on.role === 'slider' || (on.tagName === 'input' && on.type === 'range')
}

/**
 * Whether the control the press landed on already answers that key itself.
 *
 * Space on a button is that button being pressed, and an arrow on the seek bar
 * or the volume is that control being moved. Taking either for the player
 * would run the press twice — the mute switch would silence the sound and the
 * space that pressed it would start the picture.
 */
export function answersItself(on: PressedOn | null, key: string): boolean {
  if (!on) {
    return false
  }

  if (key === ' ' || key === 'Enter') {
    return (
      on.tagName === 'button' ||
      on.tagName === 'a' ||
      on.tagName === 'summary' ||
      on.role === 'button' ||
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
  arrowup: 'louder',
  arrowdown: 'quieter',
  m: 'mute',
  f: 'fullscreen',
}

/**
 * What a press means to the player, or nothing where the press is not the
 * player's to take.
 *
 * `seeks` is false where there is no position to move to. Live is that case:
 * the only picture there is, is the edge, so back has nowhere to go and
 * forward has nothing to go into. The keys are then left alone rather than
 * given a meaning of their own — the browser keeps whatever it would have
 * done, and no assignment is invented for a player that has no seek bar to
 * mirror it.
 */
export function playerCommand(
  press: {
    key: string
    ctrlKey?: boolean
    metaKey?: boolean
    altKey?: boolean
    target?: unknown
  },
  { seeks }: { seeks: boolean },
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

  const command = KEYS[press.key.toLowerCase()]

  if (command === undefined || answersItself(on, press.key)) {
    return null
  }

  if (!seeks && (command === 'back' || command === 'forward')) {
    return null
  }

  return command
}
