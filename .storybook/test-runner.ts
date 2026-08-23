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
  },
}

export default config
