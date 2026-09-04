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

/**
 * How long the answer to a seek stays on the picture, and so how long a run of
 * presses keeps adding to one answer instead of starting another.
 *
 * 700ms. YouTube hides its seek overlay on `new g.DQ(this.hide,700,this)` and
 * Chromium's own `<video>` controls run their three-arrow pulse for `700ms`;
 * the two arrived at the number separately. The wider family sits just above
 * it — mpv's `--osd-duration` and VLC's on-screen text are both 1000ms — so
 * 700 is the short end of a real cluster rather than a number of our own.
 */
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
 *
 * `<input>` is not excluded wholesale, and that is deliberate: a player's own
 * seek bar and volume are `input[type=range]`, and a rule that threw out every
 * input would throw those out with it. Shaka carves the same hole with
 * `.shaka-range-element` and media-chrome with `isRangeInput`; here the types
 * that are written into are named instead, so a range never matches.
 *
 * `isContentEditable` is read as the property and not as an attribute match,
 * because the property is inherited — a press on a plain child node inside an
 * editable region is still the reader writing, and `matches('[contenteditable]')`
 * on that child would say it is not.
 *
 * `select` is excluded. The four players split on this — Plyr and Shaka
 * exclude it, video.js does not — and a dropdown that swallows a keystroke the
 * reader meant for it is the worse of the two failures.
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

/**
 * The roles whose own activation key is Space, so a press on one of them is
 * that control being used and not the player being asked for anything.
 *
 * Plyr is the one that spells this rule out; the rest of the list is what
 * WAI-ARIA gives each role as its keyboard activation.
 */
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
  /*
   * J and L beside the arrows, which is the pair YouTube and Vimeo both carry
   * for the same two moves. They are not a second assignment: they call what
   * the arrows call and what the two buttons on the bar call, so the rule that
   * every key mirrors a control the eye can find still holds.
   */
  j: 'back',
  l: 'forward',
  arrowup: 'louder',
  arrowdown: 'quieter',
  m: 'mute',
  f: 'fullscreen',
  /* The caption switch is on the bar, so the key that presses it may exist. */
  c: 'captions',
}

/**
 * The keys the player takes only once the reader has aimed at it.
 *
 * The arrows scroll, and the screen hands the player the focus as it opens, so
 * a player that took them would leave the page with no way down it that needs
 * no pointer. Neither of the two players measured gives the arrows to the
 * player as a whole: video.js leaves them to its sliders, and Shaka passes
 * them only with the seek bar focused or in full screen.
 *
 * Nothing else here has a default worth keeping, and Space is the key a reader
 * presses without aiming at anything — which is the whole reason the screen
 * takes the focus on open.
 */
const ONLY_ONCE_AIMED = new Set([
  'arrowleft',
  'arrowright',
  'arrowup',
  'arrowdown',
])

/**
 * What a press means to the player, or nothing where the press is not the
 * player's to take.
 *
 * `captions` is only taken where there is a switch on the bar for it to press.
 * A recording has one but it is not wired to anything yet, and a key that
 * silently does nothing is worse than a key that is not taken.
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
  {
    seeks,
    captions = false,
    aimed = true,
  }: {
    seeks: boolean
    captions?: boolean
    /**
     * Whether the reader has aimed at the player — pressed it, or reached a
     * control in it — rather than the screen having focused it on open.
     */
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
