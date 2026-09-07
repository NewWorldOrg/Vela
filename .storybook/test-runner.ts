import type { Page } from 'playwright'
import { type TestRunnerConfig, getStoryContext } from '@storybook/test-runner'

interface Screen {
  width: number
  height: number
}

let opened: Screen | null = null

interface MissedTarget {
  name: string
  hit: string
  need: string
  box: string
}

interface OversizeArea {
  name: string
  area: number
  drawn: number
}

interface Findings {
  missed: MissedTarget[]
  taken: string[]
  overreached: OversizeArea[]
}

const BAIT = 'a control the probe has to catch'

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

function measureTapTargets(): Findings {
  const TAP = 44
  const SELECTOR =
    'button, a[href], [role="button"], [role="tab"], [role="switch"], ' +
    '[role="checkbox"], [role="radio"], [role="menuitem"], ' +
    '[role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], ' +
    '[data-pressable-row], ' +
    'input:not([type="hidden"]), textarea, select, summary'

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

  const reachable = (centre: number, extent: number) =>
    Math.min(
      TAP,
      Math.min(centre, TAP / 2) + Math.min(extent - 1 - centre, TAP / 2) + 1,
    )

  const drawn = (box: DOMRect) => box.width > 0 && box.height > 0
  const inSight = (box: DOMRect) =>
    box.left >= 0 && box.top >= 0 && box.right <= width && box.bottom <= height

  const panesAround = (node: Element): Element[] => {
    const found: Element[] = []

    for (
      let up: Element | null = node.parentElement;
      up;
      up = up.parentElement
    ) {
      const { overflowX, overflowY } = getComputedStyle(up)

      if (
        /^(auto|scroll)$/.test(overflowX) ||
        /^(auto|scroll)$/.test(overflowY)
      ) {
        found.push(up)
      }
    }

    return found
  }

  const areaOf = (box: DOMRect) => {
    const areaWidth = Math.max(box.width, TAP)
    const areaHeight = Math.max(box.height, TAP)
    const cx = box.left + box.width / 2
    const cy = box.top + box.height / 2

    return {
      left: cx - areaWidth / 2,
      right: cx + areaWidth / 2,
      top: cy - areaHeight / 2,
      bottom: cy + areaHeight / 2,
      width: areaWidth,
      height: areaHeight,
    }
  }

  const heldBack = (box: DOMRect, node: Element) => {
    const area = areaOf(box)

    return (
      !inSight(box) ||
      panesAround(node).some((pane) => {
        const edge = pane.getBoundingClientRect()

        return (
          (area.height <= edge.height &&
            (area.top < edge.top || area.bottom > edge.bottom)) ||
          (area.width <= edge.width &&
            (area.left < edge.left || area.right > edge.right))
        )
      })
    )
  }

  const standing = new Map<Element, [number, number]>()
  const remember = (node: Element) => {
    for (let up: Element | null = node; up; up = up.parentElement) {
      if (!standing.has(up)) {
        standing.set(up, [up.scrollLeft, up.scrollTop])
      }
    }
  }

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
    if (control.closest('[data-tap-exempt]')) {
      continue
    }

    let box = control.getBoundingClientRect()
    if (drawn(box) && heldBack(box, control)) {
      remember(control)
      control.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: 'instant',
      })
      box = control.getBoundingClientRect()
    }
    if (!drawn(box) || heldBack(box, control)) {
      continue
    }

    const cx = Math.round(box.left + box.width / 2)
    const cy = Math.round(box.top + box.height / 2)

    if (worked(document.elementFromPoint(cx, cy)) !== control) {
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

    if (hitWidth < needWidth - 1 || hitHeight < needHeight - 1) {
      missed.push({
        name: named(control),
        hit: `${hitWidth}x${hitHeight}`,
        need: `${needWidth}x${needHeight}`,
        box: `${Math.round(box.width)}x${Math.round(box.height)}`,
      })
    }
  }

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

interface OffCentreFooter {
  name: string
  left: number
  right: number
  spread: number
}

function measureDialogFooters(): OffCentreFooter[] {
  const off: OffCentreFooter[] = []

  for (const footer of document.querySelectorAll(
    '[data-slot="dialog-footer"], [data-slot="alert-dialog-footer"]',
  )) {
    const style = getComputedStyle(footer)
    if (!style.display.includes('flex') || style.flexDirection !== 'row') {
      continue
    }

    const box = footer.getBoundingClientRect()
    if (box.width <= 0 || box.height <= 0) {
      continue
    }

    const buttons = [...footer.children]
      .map((child) => child.getBoundingClientRect())
      .filter((child) => child.width > 0 && child.height > 0)
    if (buttons.length === 0) {
      continue
    }

    const from =
      box.left +
      parseFloat(style.borderLeftWidth) +
      parseFloat(style.paddingLeft)
    const to =
      box.right -
      parseFloat(style.borderRightWidth) -
      parseFloat(style.paddingRight)

    const first = Math.min(...buttons.map((one) => one.left))
    const last = Math.max(...buttons.map((one) => one.right))

    const packed =
      buttons.reduce((total, one) => total + one.width, 0) +
      (parseFloat(style.columnGap) || 0) * (buttons.length - 1)

    const left = first - from
    const right = to - last
    const spread = last - first - packed

    if (Math.abs(left - right) > 1 || spread > 1) {
      const content = footer.closest('[data-slot$="dialog-content"]')
      const title = content?.querySelector('[data-slot$="dialog-title"]')

      off.push({
        name:
          `${footer.getAttribute('data-slot')} ` +
          `(${(title?.textContent ?? '').trim().slice(0, 30) || 'untitled'})`,
        left: Math.round(left),
        right: Math.round(right),
        spread: Math.round(spread),
      })
    }
  }

  return off
}

const FOOTER_BAIT = 'a footer to be caught'

async function proveTheFooterProbeCanFail(page: Page) {
  await page.evaluate((bait) => {
    const content = document.createElement('div')
    content.id = 'footer-probe-bait'
    content.dataset.slot = 'dialog-content'
    content.style.cssText =
      'position:fixed;left:20px;bottom:20px;width:320px;z-index:2147483647'

    const title = document.createElement('div')
    title.dataset.slot = 'dialog-title'
    title.textContent = bait
    content.append(title)

    const footer = document.createElement('div')
    footer.dataset.slot = 'dialog-footer'
    footer.style.cssText =
      'display:flex;flex-direction:row;justify-content:flex-end;gap:9px'

    for (const width of [80, 100]) {
      const button = document.createElement('span')
      button.style.cssText = `display:block;width:${width}px;height:28px;flex:none`
      footer.append(button)
    }

    content.append(footer)
    document.body.append(content)
  }, FOOTER_BAIT)

  const off = await page.evaluate(measureDialogFooters)

  await page.evaluate(() => {
    document.getElementById('footer-probe-bait')?.remove()
  })

  if (!off.some((one) => one.name.includes(FOOTER_BAIT))) {
    throw new Error(
      'The footer probe passed a dialog footer drawn with its buttons against ' +
        'the right edge, so it can no longer say where a dialog puts them and ' +
        'nothing a green run says about a dialog covers it. Fix ' +
        'measureDialogFooters in .storybook/test-runner.ts.',
    )
  }
}

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

interface WrongCursor {
  name: string
  is: string
  want: string
  state: string
}

interface OffControl {
  mark: number
  name: string
  x: number
  y: number
}

interface OffLook {
  hovered: boolean
  look: Record<string, string>
}

interface Stirred {
  name: string
  moved: { axis: string; was: string; now: string }[]
  axes: string[]
}

interface CursorFindings {
  wrong: WrongCursor[]
  waived: string[]
  unbaited: string[]
  unread: string[]
  misdeclared: string[]
  scanned: number
  drawn: number
  lost: string[]
  off: OffControl[]
}

const CURSOR_BAIT = 'a control whose pointer has to be caught'

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

const CURSOR_OFF = 'switched off'
const CURSOR_UNREACHABLE = 'switched off and out of the pointer events'
const CURSOR_STIRS = 'switched off and stirred by the pointer'
const CURSOR_WAIVED = 'waived'

const CURSOR_STIR_DELAY_MS = 10000
const CURSOR_STIR_SELF =
  'background-color:rgb(1,2,3);border-color:rgb(4,5,6);border-style:dotted;color:rgb(7,8,9);box-shadow:5px 5px 0 0 rgb(1,2,3);text-decoration-line:underline;opacity:0.5;translate:3px 3px;rotate:5deg;scale:1.2'
const CURSOR_STIR_ICON = 'rotate:5deg;scale:1.2;translate:2px 2px'

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

  const off = (control: Element) =>
    (control as HTMLButtonElement).disabled === true ||
    control.getAttribute('aria-disabled') === 'true' ||
    (control.hasAttribute('data-disabled') &&
      control.getAttribute('data-disabled') !== 'false')

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

  const layerOpen = [
    ...document.querySelectorAll(
      '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
    ),
  ].some((layer) => {
    const box = layer.getBoundingClientRect()
    if (box.width <= 0 || box.height <= 0) {
      return false
    }
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
    if (box.width <= 0 || box.height <= 0) {
      continue
    }

    const name = named(control)
    const isBait = name.startsWith(bait)

    if (!isBait) {
      drawn++
    }

    if (
      getComputedStyle(control).visibility === 'hidden' ||
      control.closest('[aria-hidden="true"], [inert]')
    ) {
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

function readOffLooks(): Record<string, OffLook> {
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

  row.append(
    lay(
      unreachable,
      'button',
      { disabled: '' },
      ';pointer-events:none;cursor:not-allowed',
    ),
  )

  const stirred = lay(stirs, 'button', { disabled: '', 'data-stirs': '' })
  stirred.append(
    document.createElementNS('http://www.w3.org/2000/svg', 'svg') as never,
  )
  row.append(stirred)

  const insisted = (declarations: string) =>
    declarations
      .split(';')
      .map((one) => `${one} !important`)
      .join(';')

  const rule = document.createElement('style')
  rule.id = 'cursor-probe-bait-rule'
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

function clearCursorBait() {
  document.getElementById('cursor-probe-bait')?.remove()
  document.getElementById('cursor-probe-bait-rule')?.remove()
  for (const marked of document.querySelectorAll('[data-cursor-off]')) {
    marked.removeAttribute('data-cursor-off')
  }
}

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
    await proveTheFooterProbeCanFail(page)
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
    const offCentre = await page.evaluate(measureDialogFooters)

    if (offCentre.length > 0) {
      throw new Error(
        `${context.id}: ${offCentre.length} dialog footer(s) put their ` +
          'buttons somewhere other than the middle.\n' +
          offCentre
            .map(
              (one) =>
                `  ${one.name} — ${one.left}px of space to the left of them ` +
                `and ${one.right}px to the right` +
                (one.spread > 1
                  ? `, and ${one.spread}px pushed between them`
                  : ''),
            )
            .join('\n') +
          "\nA dialog's buttons sit in the middle, and `DialogFooter` and " +
          '`AlertDialogFooter` are the one place that is decided — a screen ' +
          'does not write a `justify` of its own. See the ダイアログ section ' +
          'of the design system.',
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

    const read = async () => {
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
          'tests/storybook/cursor-exempt.test.ts as well.',
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
