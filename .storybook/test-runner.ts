import type { Page } from 'playwright'
import { type TestRunnerConfig, getStoryContext } from '@storybook/test-runner'

/**
 * The size a story asks the browser to be. What a screen does at a width is
 * decided by media queries against the viewport, so a story about a width has
 * to move the viewport: a narrow box inside a wide window resolves every one
 * of those queries as the wide window and is a different screen from the one
 * being asked about.
 */
interface Screen {
  width: number
  height: number
}

/**
 * The size the runner opened the page at, handed back to every story that does
 * not ask for one of its own — the viewport is the one page's, and a story that
 * moved it would otherwise leave it moved for the rest of the run.
 *
 * Taken in `prepare`, which runs once before any story, rather than the first
 * time a story is visited: read late, the first reading could already be a size
 * some earlier story asked for, and that size would then become the one every
 * story is handed back. Held per worker, each of which drives a page of its own.
 */
let opened: Screen | null = null

/** A control the finger cannot land on, reported back out of the page. */
interface MissedTarget {
  name: string
  hit: string
  need: string
  box: string
}

/** A press area that reaches past the thing it is the area for. */
interface OversizeArea {
  name: string
  area: number
  drawn: number
}

/** What the probe found. */
interface Findings {
  /** Controls a press cannot reach 44px of. */
  missed: MissedTarget[]
  /** Controls whose middle a neighbour's own area has taken. */
  taken: string[]
  /** Fields whose wrapping label answers presses beside them, not on them. */
  overreached: OversizeArea[]
}

/** Names the bait of the proof apart from anything a story draws. */
const BAIT = 'a control the probe has to catch'

/**
 * Every kind of control the probe is answerable for, as the bait of the proof
 * draws it. One entry per clause of SELECTOR, so a clause dropped from there
 * stops being caught here.
 *
 * The two kinds a screen cannot press its way to — a menu row and a list row —
 * are on this list for the same reason as the rest: they sit against one
 * another, they used to be waived, and a waiver that comes back has to break
 * something.
 */
const KINDS: { kind: string; tag: string; attrs?: Record<string, string> }[] = [
  { kind: 'row of a list', tag: 'div', attrs: { 'data-pressable-row': '' } },
  { kind: 'button', tag: 'button' },
  { kind: 'link', tag: 'a', attrs: { href: '#' } },
  { kind: 'pressable', tag: 'div', attrs: { role: 'button' } },
  { kind: 'tab', tag: 'div', attrs: { role: 'tab' } },
  { kind: 'switch', tag: 'div', attrs: { role: 'switch' } },
  { kind: 'checkbox', tag: 'div', attrs: { role: 'checkbox' } },
  { kind: 'radio', tag: 'div', attrs: { role: 'radio' } },
  { kind: 'menu row', tag: 'div', attrs: { role: 'menuitem' } },
  {
    kind: 'menu row that ticks',
    tag: 'div',
    attrs: { role: 'menuitemcheckbox' },
  },
  { kind: 'menu row that marks', tag: 'div', attrs: { role: 'menuitemradio' } },
  { kind: 'list row', tag: 'div', attrs: { role: 'option' } },
  { kind: 'field', tag: 'input' },
  { kind: 'long field', tag: 'textarea' },
  { kind: 'native list', tag: 'select' },
  { kind: 'disclosure', tag: 'summary' },
]

/**
 * Runs in the page and answers which controls a finger cannot land on.
 *
 * It does not read the stylesheet. It asks the browser what would answer a
 * press, point by point, outwards from the middle of each control, and stops
 * where the answer stops being that control. So it measures what a press
 * actually does — including the invisible area `tap-target` lays down, and
 * including a neighbour whose own area reaches over and takes the press.
 *
 * A control below the fold is scrolled into sight and measured there rather
 * than passed over: a screen is taller than the window it is read in, and
 * everything under the first screenful would otherwise never be asked about.
 * Every scroller is put back where it stood, because the next story is rendered
 * into this same page and one of them asserts that the guide does not move.
 *
 * Self-contained: it is serialised into the browser, and can close over
 * nothing here.
 */
function measureTapTargets(): Findings {
  const TAP = 44
  // The rows of an open menu or list are in here, and are not waived: they sit
  // against one another, so they are grown to 44px rather than given an area
  // that would reach into the row above and the row below. A field is in here
  // too, and is reached through the label that wraps it — a replaced element
  // draws no area of its own, which is a reason to wrap it, not to skip it.
  //
  // A row of a table is pressed as a whole and still has to be a row to a
  // screen reader, so it says so with `data-pressable-row` rather than with a
  // role. The role would put it in here for free and take the table apart to
  // do it; SPEC asks for the row's height, not for it to stop being a row.
  const SELECTOR =
    'button, a[href], [role="button"], [role="tab"], [role="switch"], ' +
    '[role="checkbox"], [role="radio"], [role="menuitem"], ' +
    '[role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], ' +
    '[data-pressable-row], ' +
    'input:not([type="hidden"]), textarea, select, summary'

  /**
   * The control a press at a point would work. A label counts as its own
   * control's area: pressing the words beside a checkbox ticks the checkbox.
   */
  const worked = (node: Element | null): Element | null => {
    if (!node) {
      return null
    }

    const control = node.closest(SELECTOR)
    if (control) {
      return control
    }

    const label = node.closest('label')
    if (!label) {
      return null
    }

    const named = label.htmlFor ? document.getElementById(label.htmlFor) : null
    if (named?.matches(SELECTOR)) {
      return named
    }

    return label.querySelector(SELECTOR)
  }

  const width = window.innerWidth
  const height = window.innerHeight

  /**
   * What 44px can amount to at a point: a control against the edge of the
   * screen has nowhere to grow on that side, and the edge is not a miss —
   * a press there still lands on it.
   */
  const reachable = (centre: number, extent: number) =>
    Math.min(
      TAP,
      Math.min(centre, TAP / 2) + Math.min(extent - 1 - centre, TAP / 2) + 1,
    )

  const drawn = (box: DOMRect) => box.width > 0 && box.height > 0
  const inSight = (box: DOMRect) =>
    box.left >= 0 && box.top >= 0 && box.right <= width && box.bottom <= height

  /**
   * Where every scroller stood before anything was brought into sight, kept so
   * they can be put back once the measuring is done.
   */
  const standing = new Map<Element, [number, number]>()
  const remember = (node: Element) => {
    // The chain ends at the document element, which is what a window scroll
    // moves, so the page's own position is remembered along with the panes'.
    for (let up: Element | null = node; up; up = up.parentElement) {
      if (!standing.has(up)) {
        standing.set(up, [up.scrollLeft, up.scrollTop])
      }
    }
  }

  /**
   * Turns the areas off for one reading, which is how a neighbour's area is
   * told apart from a dialog: without the areas, only the dialog is still there.
   */
  const areasOff = document.createElement('style')
  areasOff.textContent = '.tap-target::after{display:none !important}'
  const withoutAreas = (read: () => boolean) => {
    document.head.append(areasOff)
    try {
      return read()
    } finally {
      areasOff.remove()
    }
  }

  const missed: MissedTarget[] = []
  const taken: string[] = []
  const named = (control: Element) =>
    control.getAttribute('aria-label') ||
    (control.textContent ?? '').trim().slice(0, 30) ||
    control.tagName.toLowerCase()

  for (const control of document.querySelectorAll(SELECTOR)) {
    // Declared where it applies: a programme cell is as tall as the programme
    // is long, and the rows of an open menu sit against one another.
    if (control.closest('[data-tap-exempt]')) {
      continue
    }

    let box = control.getBoundingClientRect()
    if (drawn(box) && !inSight(box)) {
      remember(control)
      control.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: 'instant',
      })
      box = control.getBoundingClientRect()
    }
    // Drawn nowhere, or held out of sight by something other than the scroll —
    // a drawer that is shut, the preview's own furniture.
    if (!drawn(box) || !inSight(box)) {
      continue
    }

    const cx = Math.round(box.left + box.width / 2)
    const cy = Math.round(box.top + box.height / 2)

    if (worked(document.elementFromPoint(cx, cy)) !== control) {
      // Something is over it. A dialog or a drawer is not this story's
      // question; a neighbour's own area is the whole of the question.
      if (
        withoutAreas(
          () => worked(document.elementFromPoint(cx, cy)) === control,
        )
      ) {
        taken.push(named(control))
      }
      continue
    }

    const reach = (dx: number, dy: number) => {
      const limit =
        Math.ceil(Math.max(TAP, dx === 0 ? box.height : box.width) / 2) + 2
      let far = 0
      for (let step = 1; step <= limit; step++) {
        if (
          worked(document.elementFromPoint(cx + dx * step, cy + dy * step)) !==
          control
        ) {
          break
        }
        far = step
      }
      return far
    }

    const hitWidth = reach(-1, 0) + reach(1, 0) + 1
    const hitHeight = reach(0, -1) + reach(0, 1) + 1
    const needWidth = reachable(cx, width)
    const needHeight = reachable(cy, height)

    // A pixel of slack: the probe walks whole pixels over fractional boxes.
    if (hitWidth < needWidth - 1 || hitHeight < needHeight - 1) {
      missed.push({
        name: named(control),
        hit: `${hitWidth}x${hitHeight}`,
        need: `${needWidth}x${needHeight}`,
        box: `${Math.round(box.width)}x${Math.round(box.height)}`,
      })
    }
  }

  /**
   * The other way a wrapping label goes wrong. It is the box the layout sees,
   * so a width left on the field instead of on the label leaves the label at
   * the width of whatever holds it, answering presses on the empty space
   * beside a field the finger never went near. Too small is the failure this
   * probe was built for; this is the failure it invites, and it is invisible —
   * nothing is drawn where the presses are being taken.
   *
   * Height is not asked about: 6px a side is what the area is made of.
   */
  const overreached: OversizeArea[] = []
  for (const area of document.querySelectorAll('[data-slot="input-area"]')) {
    const field = area.querySelector('input, textarea, select')
    if (!field) {
      continue
    }

    const a = area.getBoundingClientRect()
    const f = field.getBoundingClientRect()
    if (!drawn(a) || !drawn(f) || a.width - f.width <= 1) {
      continue
    }

    overreached.push({
      name: named(field),
      area: Math.round(a.width),
      drawn: Math.round(f.width),
    })
  }

  for (const [node, [left, top]] of standing) {
    node.scrollLeft = left
    node.scrollTop = top
  }

  return { missed, taken, overreached }
}

/**
 * Proves the probe still catches a control that is too small, before a run is
 * allowed to pass on it — and catches one of every kind it is answerable for.
 *
 * A probe that finds nothing to look at — a selector edited into one that
 * matches no control, a page that never rendered — answers exactly what a page
 * whose every control is big enough answers: no misses. Nothing later in the
 * run can tell those two apart, so a control of each kind is put on the page
 * deliberately 12px square and the probe is made to name every one of them.
 *
 * One bait per kind rather than one bait in total, because the way this gate
 * was got round before was not turning it off: it was leaving a kind of control
 * outside the selector, where a green run says nothing about it. Losing a kind
 * now costs a red run at the first story.
 *
 * The baits are laid in a row 40px apart so none of them stands over another,
 * which would make the probe skip it as covered rather than name it as small.
 */
async function proveTheProbeCanFail(page: Page) {
  const named = (kind: string) => `${BAIT}: ${kind}`

  await page.evaluate(
    ({ bait, kinds }) => {
      const row = document.createElement('div')
      row.id = 'tap-probe-bait'
      row.style.cssText =
        'position:fixed;left:20px;top:50%;display:flex;gap:28px;z-index:2147483647'

      for (const { kind, tag, attrs } of kinds) {
        const small = document.createElement(tag)
        small.setAttribute('aria-label', `${bait}: ${kind}`)
        for (const [name, value] of Object.entries(attrs ?? {})) {
          small.setAttribute(name, value)
        }
        small.style.cssText =
          'width:12px;height:12px;min-width:0;min-height:0;padding:0;margin:0;border:0;appearance:none;flex:none'
        row.append(small)
      }

      document.body.append(row)

      // The other bait, for the other way a wrapping label goes wrong: an area
      // reaching well past the field it wraps. Drawn large rather than small,
      // so it cannot be caught by the size check and only the reach check can
      // name it.
      const wide = document.createElement('label')
      wide.id = 'tap-probe-wide-bait'
      wide.dataset.slot = 'input-area'
      wide.style.cssText =
        'position:fixed;left:20px;top:20px;display:block;width:300px;z-index:2147483647'

      const inside = document.createElement('input')
      inside.setAttribute('aria-label', `${bait}: an area beside a field`)
      inside.style.cssText = 'width:60px;height:48px;margin:0;padding:0'
      wide.append(inside)

      document.body.append(wide)
    },
    { bait: BAIT, kinds: KINDS },
  )

  const { missed, overreached } = await page.evaluate(measureTapTargets)

  await page.evaluate(() => {
    document.getElementById('tap-probe-bait')?.remove()
    document.getElementById('tap-probe-wide-bait')?.remove()
  })

  const uncaught = KINDS.filter(
    ({ kind }) => !missed.some((m) => m.name === named(kind)),
  ).map(({ kind }) => kind)

  if (uncaught.length > 0) {
    throw new Error(
      `The 44px probe passed ${uncaught.length} control(s) drawn 12px square — ` +
        `${uncaught.join(', ')} — so it can no longer fail on them and nothing ` +
        'it says about a story covers them. Fix SELECTOR in ' +
        '.storybook/test-runner.ts before trusting a green run.',
    )
  }

  if (!overreached.some((o) => o.name === named('an area beside a field'))) {
    throw new Error(
      'The 44px probe passed a press area 300px wide over a field drawn 60px, ' +
        'so it can no longer say when the label around a field answers ' +
        'presses on the empty space beside it. Fix the reach check in ' +
        '.storybook/test-runner.ts before trusting a green run.',
    )
  }
}

/** A control whose pointer says the wrong thing about it. */
interface WrongCursor {
  name: string
  /** What a pointer over its middle actually shows. */
  is: string
  /** What it has to show. */
  want: string
  /** Whether it was live or switched off when it was read. */
  state: string
}

/** A switched-off control, and where to put the pointer to see it again. */
interface OffControl {
  /** The mark the probe left on it, so the same control can be read twice. */
  mark: number
  name: string
  x: number
  y: number
}

/** One reading of a switched-off control: where the pointer was, and how it
 * was drawn. */
interface OffLook {
  /** Whether the pointer was actually on it when this was read. */
  hovered: boolean
  /** One entry per axis the reading is answerable for. */
  look: Record<string, string>
}

/** A switched-off control that answered the pointer by changing. */
interface Stirred {
  name: string
  /** Every axis of the look that came out different, axis by axis. */
  moved: { axis: string; was: string; now: string }[]
  /** Axes the reading covered at all, whether they moved or not. */
  axes: string[]
}

/** What the cursor probe found, and what proves it was looking. */
interface CursorFindings {
  /** Controls whose pointer is wrong. */
  wrong: WrongCursor[]
  /** Bait the waiver took out — empty means the waiver stopped working. */
  waived: string[]
  /**
   * Clauses of the probe's selector that no bait answers for. A clause with no
   * bait is a kind of control the probe reads and nothing proves it can fail on.
   */
  unbaited: string[]
  /** Clauses a kind declares that the probe's selector does not contain. */
  unread: string[]
  /** Kinds whose bait does not match the clause they declare. */
  misdeclared: string[]
  /** Controls the story drew that the probe read. */
  scanned: number
  /** Controls the story drew at all, however they were hidden afterwards. */
  drawn: number
  /** The ones it drew and did not read, with no open layer to explain them. */
  lost: string[]
  /** Switched-off controls, to be read again with the pointer on them. */
  off: OffControl[]
}

/** Names the bait of the cursor proof apart from anything a story draws. */
const CURSOR_BAIT = 'a control whose pointer has to be caught'

/**
 * Every kind of control the cursor probe is answerable for, as the bait draws
 * it, paired with the clause of the selector that reads it.
 *
 * The two are kept together and checked three ways against the page itself: a
 * clause the probe reads with no bait answering for it, a clause a kind claims
 * that the probe does not read, and a bait that does not match the clause its
 * own entry declares. Nothing here is a note — get any of it wrong and the
 * first story is red.
 *
 * Text fields are deliberately absent from both: a pointer over a field says
 * `text` and a field is not pressed. A native `select` is absent for the same
 * reason — the browser draws its own list and its own pointer.
 */
const CURSOR_KINDS: {
  kind: string
  clause: string
  tag: string
  attrs?: Record<string, string>
}[] = [
  {
    kind: 'row of a list',
    clause: '[data-pressable-row]',
    tag: 'div',
    attrs: { 'data-pressable-row': '' },
  },
  { kind: 'button', clause: 'button', tag: 'button' },
  { kind: 'link', clause: 'a[href]', tag: 'a', attrs: { href: '#' } },
  {
    kind: 'pressable',
    clause: '[role="button"]',
    tag: 'div',
    attrs: { role: 'button' },
  },
  {
    kind: 'list opener',
    clause: '[role="combobox"]',
    tag: 'div',
    attrs: { role: 'combobox' },
  },
  { kind: 'tab', clause: '[role="tab"]', tag: 'div', attrs: { role: 'tab' } },
  {
    kind: 'switch',
    clause: '[role="switch"]',
    tag: 'div',
    attrs: { role: 'switch' },
  },
  {
    kind: 'checkbox',
    clause: '[role="checkbox"]',
    tag: 'div',
    attrs: { role: 'checkbox' },
  },
  {
    kind: 'radio',
    clause: '[role="radio"]',
    tag: 'div',
    attrs: { role: 'radio' },
  },
  {
    kind: 'menu row',
    clause: '[role="menuitem"]',
    tag: 'div',
    attrs: { role: 'menuitem' },
  },
  {
    kind: 'menu row that ticks',
    clause: '[role="menuitemcheckbox"]',
    tag: 'div',
    attrs: { role: 'menuitemcheckbox' },
  },
  {
    kind: 'menu row that marks',
    clause: '[role="menuitemradio"]',
    tag: 'div',
    attrs: { role: 'menuitemradio' },
  },
  {
    kind: 'list row',
    clause: '[role="option"]',
    tag: 'div',
    attrs: { role: 'option' },
  },
  { kind: 'disclosure', clause: 'summary', tag: 'summary' },
]

/**
 * The bait for everything the probe says beyond "this kind is read".
 *
 * `CURSOR_OFF` is the other half of the rule. `CURSOR_UNREACHABLE` is the whole
 * reason the probe walks past `pointer-events: none` instead of reading the
 * control's own `cursor`: it says `not-allowed` in the stylesheet and shows the
 * page's own pointer on the screen, so a probe that read the stylesheet would
 * pass it. `CURSOR_STIRS` is a switched-off control that changes when the
 * pointer arrives, which is what `still` and the `disabled:hover:` colours
 * exist to prevent.
 */
const CURSOR_OFF = 'switched off'
const CURSOR_UNREACHABLE = 'switched off and out of the pointer events'
const CURSOR_STIRS = 'switched off and stirred by the pointer'
const CURSOR_WAIVED = 'waived'

/**
 * What the stirring bait does to itself, and to its icon, when a pointer
 * arrives — one declaration per axis the reading is answerable for.
 *
 * This is the other half of a pair, and the two halves are written apart on
 * purpose. `readOffLooks` decides what is read; this decides what moves. The
 * run demands that the two agree exactly: an axis read here and not stirred
 * there is an axis nothing proves the reading can see, and an axis stirred here
 * and not read there is a way for a control to change with nobody watching.
 * They were one list once, and dropping three lines from the reading took the
 * whole of `still` out of the run without a word.
 *
 * The delay is the second half of it, and it is there to be overruled. A
 * transition would make every reading one of a control mid-change; the run
 * already switches them all off, and this asks for one so long that if it is
 * ever granted the run says so instead of quietly measuring nothing.
 */
const CURSOR_STIR_DELAY_MS = 10000
const CURSOR_STIR_SELF =
  'background-color:rgb(1,2,3);border-color:rgb(4,5,6);border-style:dotted;color:rgb(7,8,9);box-shadow:5px 5px 0 0 rgb(1,2,3);text-decoration-line:underline;opacity:0.5;translate:3px 3px;rotate:5deg;scale:1.2'
const CURSOR_STIR_ICON = 'rotate:5deg;scale:1.2;translate:2px 2px'

/**
 * Runs in the page and answers which controls say the wrong thing about
 * themselves under the pointer.
 *
 * Tailwind v4's preflight sets `button { cursor: default }`, so the one visible
 * sign that a thing can be pressed is not something a control has — it is
 * something a control has to say. A link says it on its own and nothing else
 * does, which is how a whole app of silent buttons read as one screen's
 * problem.
 *
 * It reads the pointer that would actually be shown rather than the line in the
 * stylesheet. A control taken out of the pointer events lets the pointer
 * through to whatever is behind it and shows that cursor instead of its own, so
 * `cursor-not-allowed` written beside `pointer-events: none` is a line that
 * never reaches a screen, and is reported as the `default` a reader would
 * actually see.
 *
 * What it did not read, it says. Everything the story drew is counted before
 * any of the skipping, and a control skipped with no open layer on the page to
 * explain it is reported by name — hiding the page from the probe is otherwise
 * indistinguishable from a page with nothing to hide, and `inert`,
 * `visibility: hidden` and a box parked off the side of the window all do it.
 *
 * Self-contained: it is serialised into the browser, and can close over nothing
 * here.
 */
function measureCursors({
  bait,
  kinds,
}: {
  bait: string
  kinds: { kind: string; clause: string }[]
}): CursorFindings {
  const clauses = [
    'button',
    'a[href]',
    '[role="button"]',
    '[role="combobox"]',
    '[role="tab"]',
    '[role="switch"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="menuitem"]',
    '[role="menuitemcheckbox"]',
    '[role="menuitemradio"]',
    '[role="option"]',
    '[data-pressable-row]',
    'summary',
  ]
  const SELECTOR = clauses.join(', ')

  /** Switched off, however this control happens to say so. */
  const off = (control: Element) =>
    (control as HTMLButtonElement).disabled === true ||
    control.getAttribute('aria-disabled') === 'true' ||
    (control.hasAttribute('data-disabled') &&
      control.getAttribute('data-disabled') !== 'false')

  /**
   * The pointer a reader sees over the middle of a control. Not the control's
   * own `cursor` when it is out of the pointer events: the pointer goes through
   * it and takes the cursor of the nearest thing that is still there to answer.
   */
  const showing = (control: Element): string => {
    for (let up: Element | null = control; up; up = up.parentElement) {
      const style = getComputedStyle(up)
      if (style.pointerEvents !== 'none') {
        return style.cursor
      }
    }
    return 'auto'
  }

  const named = (control: Element) =>
    control.getAttribute('aria-label') ||
    (control.textContent ?? '').trim().slice(0, 30) ||
    control.tagName.toLowerCase()

  /**
   * Whether something is open over the page. Radix marks everything behind an
   * open list, menu or dialog `aria-hidden`, and those controls are genuinely
   * out of reach — which is the one reason the probe accepts for not having
   * read something the story drew.
   */
  const layerOpen = [
    ...document.querySelectorAll(
      '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
    ),
  ].some((layer) => {
    const box = layer.getBoundingClientRect()
    if (box.width <= 0 || box.height <= 0) {
      return false
    }
    // A shut drawer keeps its role and its box. What tells it from an open one
    // is that it has taken itself out of reach along with the page behind it.
    return !layer.closest('[aria-hidden="true"], [inert]')
  })

  const wrong: WrongCursor[] = []
  const waived: string[] = []
  const lost: string[] = []
  const offs: OffControl[] = []
  let scanned = 0
  let drawn = 0
  let mark = 0

  for (const control of document.querySelectorAll(SELECTOR)) {
    const box = control.getBoundingClientRect()
    // Drawn nowhere at all — a subtree that is `display: none`, or a control
    // with no box of its own. Nothing was laid out, so there is nothing a
    // reader could have pointed at and nothing to account for.
    if (box.width <= 0 || box.height <= 0) {
      continue
    }

    const name = named(control)
    const isBait = name.startsWith(bait)

    // Counted before every skip below, and without asking whether it can be
    // seen: `visibility: hidden` is another way to take a page away from the
    // probe, and it leaves the box behind. Where the box sits is not asked at
    // all — a control below the fold is read like any other, so parking the
    // page off the side of the window hides nothing.
    if (!isBait) {
      drawn++
    }

    if (
      getComputedStyle(control).visibility === 'hidden' ||
      control.closest('[aria-hidden="true"], [inert]')
    ) {
      // Out of reach, and there are only two reasons that is not the probe
      // being walked past: something is open over the page, or the control is
      // in a drawer the screen has shut and said so.
      if (!isBait && !layerOpen && !control.closest('[data-cursor-shut]')) {
        lost.push(name)
      }
      continue
    }

    if (control.closest('[data-cursor-exempt]')) {
      if (isBait) {
        waived.push(name)
      } else {
        lost.push(name)
      }
      continue
    }

    if (!isBait) {
      scanned++
    }

    const switchedOff = off(control)
    const want = switchedOff ? 'not-allowed' : 'pointer'
    const is = showing(control)

    if (is !== want) {
      wrong.push({
        name,
        is,
        want,
        state: switchedOff ? 'switched off' : 'live',
      })
    }

    // Only the ones a pointer can reach where the page stands are marked for
    // the second reading. A cursor is the same wherever a control sits, so
    // everything is read for that; but hover has to be done to a control, and
    // scrolling one into view would move a page that one story asserts does
    // not move. What is below the fold here is on screen in another story.
    if (
      switchedOff &&
      box.right > 0 &&
      box.bottom > 0 &&
      box.left < window.innerWidth &&
      box.top < window.innerHeight
    ) {
      mark++
      control.setAttribute('data-cursor-off', String(mark))
      offs.push({
        mark,
        name,
        x: Math.round(box.left + box.width / 2),
        y: Math.round(box.top + box.height / 2),
      })
    }
  }

  const baits = document.getElementById('cursor-probe-bait')
  const declared = kinds.map(({ clause }) => clause)
  const unbaited = clauses.filter(
    (clause) => !baits || baits.querySelectorAll(clause).length === 0,
  )
  const unread = declared.filter((clause) => !clauses.includes(clause))
  const misdeclared = kinds
    .filter(({ kind, clause }) => {
      const drawnBait = baits?.querySelector(`[aria-label="${bait}: ${kind}"]`)
      return !drawnBait || !drawnBait.matches(clause)
    })
    .map(({ kind, clause }) => `${kind} (${clause})`)

  return {
    wrong,
    waived,
    unbaited,
    unread,
    misdeclared,
    scanned,
    drawn,
    lost: lost.slice(0, 12),
    off: offs,
  }
}

/**
 * How every switched-off control on the page is drawn, axis by axis, to be
 * compared against itself with the pointer somewhere else and then on it.
 *
 * One line per axis on purpose, so that dropping an axis is a thing a person
 * can do and the run can catch: the bait stirs every one of them, and a run
 * where an axis has stopped being read is a run where the bait stirred
 * something nobody saw.
 *
 * Movement is spelled the same however the browser happens to phrase it:
 * `translate: none` at rest and `translate: 0px` under `translate-0` are the
 * same nothing, and a check that could not say so would report every frozen
 * control as having moved.
 *
 * Self-contained: serialised into the browser, closing over nothing here.
 */
function readOffLooks(): Record<string, OffLook> {
  // `:hover` is part of the reading. Playwright's pointer move is answered once
  // the page has processed it, so by the time this runs the state is settled —
  // and if that ever stops being true, the bait comes back unmoved and says so
  // rather than every reading quietly becoming one taken too early.
  const settled = (value: string, neutral: number) => {
    if (value === 'none' || value === '') {
      return String(neutral)
    }
    const numbers = value.match(/-?\d*\.?\d+/g)
    return numbers && numbers.every((one) => Number(one) === neutral)
      ? String(neutral)
      : value
  }

  const looks: Record<string, OffLook> = {}

  for (const control of document.querySelectorAll('[data-cursor-off]')) {
    const style = getComputedStyle(control)
    const look: Record<string, string> = {}

    look['self:background-color'] = style.backgroundColor
    look['self:border-color'] = style.borderColor
    look['self:border-style'] = style.borderStyle
    look['self:color'] = style.color
    look['self:box-shadow'] = style.boxShadow
    look['self:text-decoration-line'] = style.textDecorationLine
    look['self:opacity'] = style.opacity
    look['self:translate'] = settled(style.translate, 0)
    look['self:rotate'] = settled(style.rotate, 0)
    look['self:scale'] = settled(style.scale, 1)

    const icon = control.querySelector('svg')
    if (icon) {
      const drawn = getComputedStyle(icon)
      look['icon:rotate'] = settled(drawn.rotate, 0)
      look['icon:scale'] = settled(drawn.scale, 1)
      look['icon:translate'] = settled(drawn.translate, 0)
    }

    looks[control.getAttribute('data-cursor-off') ?? ''] = {
      hovered: control.matches(':hover'),
      look,
    }
  }

  return looks
}

/**
 * Lays one control of every kind the probe is answerable for, each told to show
 * `default`, plus the four that stand for what the probe says beyond that.
 *
 * A probe that finds nothing to look at answers exactly what a page whose every
 * control is right answers, and nothing later in the run can tell those two
 * apart. So the bait goes down before every story rather than once at the
 * start: each story's reading comes with the proof that the thing doing the
 * reading was working at that moment, on that page.
 *
 * The waived one is there for the other half of it. A waiver nobody exercises
 * rots into a list of names the probe never looks at, and the day it stops
 * being honoured every waived control silently rejoins the run. This one has to
 * come back out on the waived list, or the run is red.
 */
function layCursorBait({
  bait,
  kinds,
  off,
  unreachable,
  stirs,
  waived,
  stirSelf,
  stirIcon,
  stirDelay,
}: {
  bait: string
  kinds: { kind: string; tag: string; attrs?: Record<string, string> }[]
  off: string
  unreachable: string
  stirs: string
  waived: string
  stirSelf: string
  stirIcon: string
  stirDelay: number
}) {
  const row = document.createElement('div')
  row.id = 'cursor-probe-bait'
  // `pointer-events` is spelled out because an open dialog takes the whole body
  // out of them, and bait a pointer cannot reach is bait that never stirs — the
  // check that the probe can see a control move would have gone quiet on every
  // story with something open, which is where it is needed most.
  row.style.cssText =
    'position:fixed;left:20px;top:0;display:flex;gap:8px;z-index:2147483646;pointer-events:auto'

  const lay = (
    kind: string,
    tag: string,
    attrs: Record<string, string> = {},
    extra = '',
  ) => {
    const control = document.createElement(tag)
    control.setAttribute('aria-label', `${bait}: ${kind}`)
    for (const [name, value] of Object.entries(attrs)) {
      control.setAttribute(name, value)
    }
    control.style.cssText =
      'width:12px;height:12px;min-width:0;min-height:0;padding:0;margin:0;border:0;appearance:none;flex:none;cursor:default;background:transparent;pointer-events:auto' +
      extra
    return control
  }

  for (const { kind, tag, attrs } of kinds) {
    row.append(lay(kind, tag, attrs))
  }

  row.append(lay(off, 'button', { disabled: '' }))

  // Says `not-allowed` and shows the page's pointer, because nothing can reach
  // it. Caught only by a probe that walks past `pointer-events: none`.
  row.append(
    lay(
      unreachable,
      'button',
      { disabled: '' },
      ';pointer-events:none;cursor:not-allowed',
    ),
  )

  // Switched off, and drawn differently on every axis the reading covers the
  // moment the pointer arrives — after a delay, so that reading too early is a
  // red run rather than a coin toss.
  const stirred = lay(stirs, 'button', { disabled: '', 'data-stirs': '' })
  stirred.append(
    document.createElementNS('http://www.w3.org/2000/svg', 'svg') as never,
  )
  row.append(stirred)

  // The bait carries its size and its blank look as inline style, which no
  // stylesheet rule can outrank — without this the two axes those inline
  // declarations touch would sit still and read as axes the probe cannot see.
  const insisted = (declarations: string) =>
    declarations
      .split(';')
      .map((one) => `${one} !important`)
      .join(';')

  const rule = document.createElement('style')
  rule.id = 'cursor-probe-bait-rule'
  // The delay is a canary, not a mechanism. The run already switches every
  // transition off with `!important`, so this one is overruled and the bait
  // answers the pointer at once; if that ever stops being true the bait would
  // take ten seconds to answer, and `stirsAtOnce` below stops the run rather
  // than let every reading be taken of a control mid-change.
  rule.textContent =
    `#cursor-probe-bait [data-stirs],#cursor-probe-bait [data-stirs] svg{transition:all 1ms linear ${stirDelay}ms}` +
    `#cursor-probe-bait [data-stirs]:hover{${insisted(stirSelf)}}` +
    `#cursor-probe-bait [data-stirs]:hover svg{${insisted(stirIcon)}}`
  document.head.append(rule)

  const behindTheWaiver = document.createElement('div')
  behindTheWaiver.dataset.cursorExempt = 'the bait that proves the waiver works'
  behindTheWaiver.append(lay(waived, 'button'))
  row.append(behindTheWaiver)

  document.body.append(row)
}

/** Takes the bait, and the marks the probe left, back off the page. */
function clearCursorBait() {
  document.getElementById('cursor-probe-bait')?.remove()
  document.getElementById('cursor-probe-bait-rule')?.remove()
  for (const marked of document.querySelectorAll('[data-cursor-off]')) {
    marked.removeAttribute('data-cursor-off')
  }
}

/**
 * Carries the theme a run is held to into the preview.
 *
 * The runner loads `iframe.html` once and then renders every story inside that
 * same page, so there is no per-story URL and no way to reach the toolbar
 * global. The theme therefore rides on the query string of the single
 * navigation, where `.storybook/preview.tsx` reads it. Only `prepare` can shape
 * that URL, so it is reproduced here rather than extended.
 *
 * The story id is deliberately left off: naming one makes the preview resolve a
 * selection during boot and the page the runner has just taken hold of is
 * replaced under it, which fails every story with a destroyed execution
 * context.
 */
const config: TestRunnerConfig = {
  async prepare({ page, browserContext, testRunnerConfig }) {
    const target = process.env.TARGET_URL
    if (!target) {
      throw new Error('TARGET_URL is not set')
    }

    const url = new URL('iframe.html', target)
    url.searchParams.set('theme', process.env.STORYBOOK_THEME ?? 'light')
    const href = url.toString()

    if (testRunnerConfig?.getHttpHeaders) {
      await browserContext.setExtraHTTPHeaders(
        await testRunnerConfig.getHttpHeaders(href),
      )
    }

    await page.goto(href, { waitUntil: 'load' })

    opened = page.viewportSize()

    await proveTheProbeCanFail(page)
  },

  async preVisit(page: Page, context) {
    const { parameters } = await getStoryContext(page, context)
    const asked: Screen | undefined = (parameters as { screen?: Screen }).screen
    const size: Screen | null = asked ?? opened

    if (size) {
      await page.setViewportSize(size)
    }
  },

  async postVisit(page: Page, context) {
    const { missed, taken, overreached } =
      await page.evaluate(measureTapTargets)

    if (missed.length + taken.length + overreached.length > 0) {
      const lines = [
        ...missed.map(
          (m) =>
            `  ${m.name} — the press reaches ${m.hit}, and has to reach ${m.need} (drawn ${m.box})`,
        ),
        ...taken.map(
          (name) =>
            `  ${name} — a neighbour's area answers a press on its middle`,
        ),
        ...overreached.map(
          (o) =>
            `  ${o.name} — the press area is ${o.area} wide over a field drawn ${o.drawn}`,
        ),
      ]

      throw new Error(
        `${context.id}: ${lines.length} control(s) do not answer a press where they should.\n` +
          `${lines.join('\n')}\n` +
          'Lay `tap-target` on a control with room around it, and space it ' +
          'further from its neighbour if the two areas collide. A row that ' +
          'sits against its neighbours grows to 44px tall instead, an area ' +
          'there taking only the presses meant for them; a field is wrapped ' +
          'in a `<label class="tap-area">`, which a press moves focus through, ' +
          'and the width goes on that label — `areaClassName` — so the area ' +
          'is the field and not the space beside it.',
      )
    }
    await page.evaluate(layCursorBait, {
      bait: CURSOR_BAIT,
      kinds: CURSOR_KINDS,
      off: CURSOR_OFF,
      unreachable: CURSOR_UNREACHABLE,
      stirs: CURSOR_STIRS,
      waived: CURSOR_WAIVED,
      stirSelf: CURSOR_STIR_SELF,
      stirIcon: CURSOR_STIR_ICON,
      stirDelay: CURSOR_STIR_DELAY_MS,
    })

    /**
     * Reads the page twice over for every switched-off control: once with the
     * pointer away from all of them, once with it on the one being read. What
     * `:hover` does to a control is not something the page can be asked — it
     * has to be done to it. Nothing eases into it while that is happening:
     * `layCursorBait` switches every transition on the page off, so both
     * readings are of a settled state and neither is a race.
     */
    const read = async () => {
      // The bait asked for a ten-second transition. If it got one, every
      // reading below would be of a control on its way somewhere rather than
      // of either state, and the whole hover check would be measuring nothing.
      const eased = await page.evaluate(() => {
        const control = document.querySelector(
          '#cursor-probe-bait [data-stirs]',
        )
        if (!control) {
          return 'the stirring bait is not on the page'
        }
        const style = getComputedStyle(control)
        return style.transitionDuration === '0s' &&
          style.transitionDelay === '0s'
          ? ''
          : `${style.transitionDuration} / ${style.transitionDelay}`
      })

      if (eased !== '') {
        throw new Error(
          `${context.id}: the run is no longer switching transitions off — ` +
            `the bait's is ${eased}. Every reading of a switched-off control ` +
            'would be taken while it was still on its way, so the check that ' +
            'they hold still would pass on controls that do not. Switch them ' +
            'off before reading, in .storybook/test-runner.ts.',
        )
      }

      const found = await page.evaluate(measureCursors, {
        bait: CURSOR_BAIT,
        kinds: CURSOR_KINDS,
      })
      const atRest = await page.evaluate(readOffLooks)
      const stirred: Stirred[] = []

      for (const one of found.off) {
        await page.mouse.move(one.x, one.y)

        const now = (await page.evaluate(readOffLooks))[String(one.mark)]
        const was = atRest[String(one.mark)]
        // Read only what the pointer actually reached. A control with
        // something over it never takes the hover, and comparing it with
        // itself would say "held still" about a control nobody pointed at.
        if (!now || !was || !now.hovered) {
          continue
        }

        const axes = Object.keys(was.look)
        const moved = axes
          .filter((axis) => was.look[axis] !== now.look[axis])
          .map((axis) => ({ axis, was: was.look[axis], now: now.look[axis] }))

        if (moved.length > 0) {
          stirred.push({ name: one.name, moved, axes })
        }
      }

      return { found, stirred }
    }

    // The runner renders every story into this one page, so bait left behind by
    // a throw would fail every story after it, for a reason that is not theirs.
    const { found: cursors, stirred } = await read().finally(async () => {
      await page.mouse.move(0, 0)
      await page.evaluate(clearCursorBait)
    })

    const asBait = (kind: string) => `${CURSOR_BAIT}: ${kind}`
    const caught = new Set(cursors.wrong.map((one) => one.name))
    const uncaught = [
      ...CURSOR_KINDS.map(({ kind }) => kind),
      CURSOR_OFF,
      CURSOR_UNREACHABLE,
    ].filter((kind) => !caught.has(asBait(kind)))

    if (uncaught.length > 0) {
      throw new Error(
        `${context.id}: the cursor probe passed ${uncaught.length} bait ` +
          'control(s) it has to catch — ' +
          `${uncaught.join(', ')} — so it can no longer fail on them and ` +
          'nothing it says about this story covers them. Fix the clauses or ' +
          'the walk past `pointer-events: none` in measureCursors, in ' +
          '.storybook/test-runner.ts, before trusting a green run.',
      )
    }

    if (cursors.unbaited.length > 0) {
      throw new Error(
        `${context.id}: ${cursors.unbaited.length} clause(s) of the cursor ` +
          `probe — ${cursors.unbaited.join(', ')} — have no bait answering ` +
          'for them, so the probe reads that kind of control and nothing ' +
          'proves it can fail on one. Put the kind back into CURSOR_KINDS in ' +
          '.storybook/test-runner.ts.',
      )
    }

    if (cursors.unread.length > 0) {
      throw new Error(
        `${context.id}: ${cursors.unread.length} clause(s) named by ` +
          `CURSOR_KINDS — ${cursors.unread.join(', ')} — are not in the ` +
          'probe’s selector, so a bait is laid for a kind of control the ' +
          'probe never looks at. Fix the clauses in .storybook/test-runner.ts.',
      )
    }

    if (cursors.misdeclared.length > 0) {
      throw new Error(
        `${context.id}: ${cursors.misdeclared.length} bait control(s) — ` +
          `${cursors.misdeclared.join(', ')} — do not match the clause their ` +
          'own entry in CURSOR_KINDS declares, so the pairing of a kind to ' +
          'the clause that reads it is not what it says it is.',
      )
    }

    if (!cursors.waived.includes(asBait(CURSOR_WAIVED))) {
      throw new Error(
        `${context.id}: the cursor probe no longer honours ` +
          '`data-cursor-exempt`, so every waived control has silently ' +
          'rejoined the run. Fix measureCursors in ' +
          '.storybook/test-runner.ts, or take the waiver out of ' +
          '.storybook/cursor-exempt.test.ts as well.',
      )
    }

    const stirredBait = stirred.find((one) => one.name === asBait(CURSOR_STIRS))
    const wanted = [
      ...CURSOR_STIR_SELF.split(';').map((one) => `self:${one.split(':')[0]}`),
      ...CURSOR_STIR_ICON.split(';').map((one) => `icon:${one.split(':')[0]}`),
    ]
    const unseen = stirredBait
      ? wanted.filter((axis) => !stirredBait.moved.some((m) => m.axis === axis))
      : wanted
    const unstirred = stirredBait
      ? stirredBait.axes.filter((axis) => !wanted.includes(axis))
      : []

    if (unseen.length > 0) {
      throw new Error(
        `${context.id}: the pointer was put on a switched-off control drawn ` +
          `to change on every axis, and ${unseen.length} of them came back ` +
          `unchanged — ${unseen.join(', ')}. Either readOffLooks no longer ` +
          'reads that axis, or it cannot see it move, so nothing this run ' +
          'says about a control staying still covers it. Fix readOffLooks in ' +
          '.storybook/test-runner.ts.',
      )
    }

    if (unstirred.length > 0) {
      throw new Error(
        `${context.id}: readOffLooks reads ${unstirred.length} axis/axes — ` +
          `${unstirred.join(', ')} — that the stirring bait never moves, so ` +
          'nothing proves the reading can see them change. Add the ' +
          'declaration to CURSOR_STIR_SELF or CURSOR_STIR_ICON in ' +
          '.storybook/test-runner.ts.',
      )
    }

    if (cursors.lost.length > 0) {
      throw new Error(
        `${context.id}: the story drew ${cursors.drawn} pressable control(s) ` +
          `and the probe read ${cursors.scanned} of them. ` +
          `${cursors.lost.join(', ')} — and any others — were drawn and not ` +
          'read, with nothing open over the page and no shut drawer to put ' +
          'them out of reach. `inert`, `aria-hidden`, `visibility: hidden` ' +
          'and a waiver all do this, and a probe that reads one control out ' +
          'of forty is as blind as one that reads none.',
      )
    }

    const wrong = cursors.wrong.filter(
      (one) => !one.name.startsWith(CURSOR_BAIT),
    )

    if (wrong.length > 0) {
      throw new Error(
        `${context.id}: ${wrong.length} of ${cursors.scanned} control(s) say ` +
          'the wrong thing under the pointer.\n' +
          wrong
            .map(
              (one) =>
                `  ${one.name} (${one.state}) — the pointer shows \`${one.is}\`, ` +
                `and has to show \`${one.want}\``,
            )
            .join('\n') +
          '\nTailwind v4 draws a button with `cursor: default`, so a pressable ' +
          'control has to say `cursor-pointer` itself — `pressable` in ' +
          'components/vela/tactile.ts is the pair to reach for, with `still` ' +
          'beside it wherever hover moves something. A switched-off control ' +
          'says `not-allowed`, which it cannot do while it is also out of the ' +
          'pointer events: drop `pointer-events-none` rather than write a ' +
          'cursor no screen will ever show.',
      )
    }

    const moved = stirred.filter((one) => !one.name.startsWith(CURSOR_BAIT))

    if (moved.length > 0) {
      throw new Error(
        `${context.id}: ${moved.length} switched-off control(s) answer the ` +
          'pointer by changing.\n' +
          moved
            .map(
              (one) =>
                `  ${one.name}\n` +
                one.moved
                  .map((axis) => `    ${axis.axis}: ${axis.was} -> ${axis.now}`)
                  .join('\n'),
            )
            .join('\n') +
          '\nA control that is off keeps taking pointer events so that it can ' +
          'say `not-allowed`, which puts it back in reach of every `hover:` ' +
          'rule it has. Lay `still` from components/vela/tactile.ts on it for ' +
          'the movement, and freeze whatever colour, border or shadow the ' +
          'hover changes with a `disabled:hover:` of its own.',
      )
    }
  },
}

export default config
