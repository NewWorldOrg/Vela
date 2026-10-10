import assert from 'node:assert/strict'
import { test } from 'node:test'

import { paletteOf, readClut } from '@/lib/bml/palette'
import {
  cssOf,
  cssSelectorOf,
  cssSheetOf,
  declarationsOf,
  featuresOf,
  matches,
  onGrid,
  planeIn,
  selectorOf,
  specificityOf,
  styleSheetOf,
  videoHole,
  type StyledElement,
} from '@/lib/bml/style'

const FIXED = paletteOf(null)

const css = (text: string) => cssOf(declarationsOf(text), FIXED)

test('declarations are read by name in lower case, a separator inside brackets or quotes is not a break, and !important is dropped', () => {
  assert.deepEqual(
    declarationsOf(
      ' LEFT : 10px ; clip: rect(0px, 10px; 10px, 0px); font-family: "a;b"; color-index: 7 !important;;bad; :x',
    ),
    [
      { property: 'left', value: '10px' },
      { property: 'clip', value: 'rect(0px, 10px; 10px, 0px)' },
      { property: 'font-family', value: '"a;b"' },
      { property: 'color-index', value: '7' },
    ],
  )
})

test('a selector is a run of compound selectors joined by descendants', () => {
  assert.deepEqual(selectorOf('div.menu p#a:focus'), [
    { type: 'div', id: null, classes: ['menu'], state: null },
    { type: 'p', id: 'a', classes: [], state: 'focus' },
  ])
  assert.deepEqual(selectorOf('*.x:active'), [
    { type: null, id: null, classes: ['x'], state: 'active' },
  ])
})

test('a child, sibling or attribute selector, or a state other than focus and active, is not taken', () => {
  assert.equal(selectorOf('div > p'), null)
  assert.equal(selectorOf('div + p'), null)
  assert.equal(selectorOf('p[x]'), null)
  assert.equal(selectorOf('p:hover'), null)
  assert.equal(selectorOf('p::before'), null)
})

test('a style sheet keeps the rules it takes and warns of the rest, comments and markup comments aside', () => {
  const sheet = styleSheetOf(`<!--
    /* a comment */
    @charset "EUC-JP";
    @media screen { p { left: 1px } }
    p, div > p, #x { left: 2px }
    a:hover { top: 1px }
  -->`)

  assert.equal(sheet.rules.length, 1)
  assert.equal(sheet.rules[0].selectors.length, 2)
  assert.deepEqual(sheet.rules[0].declarations, [
    { property: 'left', value: '2px' },
  ])
  assert.deepEqual(sheet.warnings, [
    'unsupported at-rule: @charset',
    'unsupported at-rule: @media',
    'unsupported selector',
    'unsupported selector',
  ])
})

test('specificity counts ids, then classes and states, then types', () => {
  assert.deepEqual(specificityOf(selectorOf('div.a #b:focus')!), [1, 2, 1])
  assert.deepEqual(specificityOf(selectorOf('*')!), [0, 0, 0])
})

const body: StyledElement = { tag: 'body', id: null, classes: [], parent: null }
const menu: StyledElement = {
  tag: 'div',
  id: 'menu',
  classes: ['m', 'n'],
  parent: body,
}
const item: StyledElement = { tag: 'p', id: 'a', classes: [], parent: menu }

test('a selector picks an element through its ancestors, in its plain state only', () => {
  assert.ok(matches(selectorOf('p')!, item))
  assert.ok(matches(selectorOf('body p')!, item))
  assert.ok(matches(selectorOf('div.m.n #a')!, item))
  assert.ok(matches(selectorOf('body div p#a')!, item))
  assert.equal(matches(selectorOf('div.x p')!, item), false)
  assert.equal(matches(selectorOf('p body')!, item), false)
  assert.equal(matches(selectorOf('p:focus')!, item), false)
})

test('in the converted page an element is named by its BML tag and its states by attributes', () => {
  assert.equal(
    cssSelectorOf(selectorOf('div.m p#a:focus')!),
    '[data-bml-tag="div"].m [data-bml-tag="p"]#a[data-bml-focus]',
  )
  assert.equal(cssSelectorOf(selectorOf('*:active')!), '[data-bml-active]')
  assert.equal(cssSelectorOf(selectorOf('#9a')!), '#\\39 a')
})

test('position, size, box, text and display properties are written as CSS', () => {
  const cases: [string, string][] = [
    ['left: 10px', 'left: 10px'],
    ['top: 0', 'top: 0px'],
    ['width: 12.5px', 'width: 12.5px'],
    ['height: auto', 'height: auto'],
    ['position: absolute', 'position: absolute'],
    ['visibility: hidden', 'visibility: hidden'],
    ['display: none', 'display: none'],
    ['overflow: hidden', 'overflow: hidden'],
    ['clip: rect(0px, 10px, 20px, 0px)', 'clip: rect(0px, 10px, 20px, 0px)'],
    ['padding: 1px 2px', 'padding: 1px 2px'],
    ['padding-left: 4px', 'padding-left: 4px'],
    ['margin-top: 3px', 'margin-top: 3px'],
    ['border-width: 2px', 'border-width: 2px'],
    ['border-style: solid', 'border-style: solid'],
    ['border-bottom-width: 1px', 'border-bottom-width: 1px'],
    ['border-left-style: dashed', 'border-left-style: dashed'],
    ['font-size: 24px', 'font-size: 24px'],
    ['font-weight: bold', 'font-weight: bold'],
    ['font-style: normal', 'font-style: normal'],
    ['line-height: 36px', 'line-height: 36px'],
    ['letter-spacing: 2px', 'letter-spacing: 2px'],
    ['text-align: center', 'text-align: center'],
    ['white-space: pre', 'white-space: pre'],
    ['visibility: inherit', 'visibility: inherit'],
  ]

  for (const [bml, expected] of cases) {
    assert.deepEqual(css(bml), { css: expected, warnings: [] }, bml)
  }
})

test('every font family is the bundled round gothic, with the broadcast marks behind it', () => {
  assert.equal(
    css('font-family: 丸ゴシック').css,
    'font-family: "Data Broadcast", "Broadcast Marks", sans-serif',
  )
})

test('a colour is named by its index in the palette', () => {
  assert.equal(css('color-index: 7').css, 'color: rgb(255 255 255)')
  assert.equal(
    css('background-color-index: 8').css,
    'background-color: rgb(0 0 0 / 0); --bml-background: rgb(0 0 0 / 0)',
  )
  assert.equal(
    css('border-top-color-index: 1').css,
    'border-top-color: rgb(255 0 0)',
  )
  assert.equal(css('border-color-index: 2').css, 'border-color: rgb(0 255 0)')

  const palette = paletteOf(
    readClut(Uint8Array.from([0xc8, 200, 200, 1, 2, 3, 255])),
  )

  assert.equal(
    cssOf(declarationsOf('color-index: 200'), palette).css,
    'color: rgb(1 2 3)',
  )
})

test('BML properties are left to the runtime, and anything else it does not take is dropped with a warning', () => {
  assert.deepEqual(
    css('nav-index: 1; used-key-list: basic; resolution: 960x540'),
    {
      css: '',
      warnings: [],
    },
  )
  assert.deepEqual(css('z-index: 3; -wap-marquee-style: scroll; color: red'), {
    css: '',
    warnings: [
      'unsupported property: z-index',
      'unsupported property: -wap-marquee-style',
      'unsupported property: color',
    ],
  })
  assert.deepEqual(css('left: 3em; color-index: 300; display: flex'), {
    css: '',
    warnings: [
      'unsupported value of left',
      'unsupported value of color-index',
      'unsupported value of display',
    ],
  })
})

test('a converted sheet keeps each rule that still says something', () => {
  const sheet = styleSheetOf(
    'p.a, #b { left: 1px; nav-index: 2 } div { nav-up: 1 }',
  )

  assert.deepEqual(cssSheetOf(sheet, FIXED), {
    css: '[data-bml-tag="p"].a, #b { left: 1px }',
    warnings: [],
  })
})

test('BML features are read into the values the runtime uses', () => {
  assert.deepEqual(
    featuresOf(
      new Map([
        ['nav-index', '3'],
        ['nav-up', '1'],
        ['nav-down', '4'],
        ['nav-left', '2'],
        ['nav-right', '0'],
        ['used-key-list', 'basic numeric-tuning'],
        ['resolution', '720x480'],
        ['display-aspect-ratio', '4v3'],
        ['clut', 'url("~/0001/a.clt")'],
      ]),
    ),
    {
      navIndex: 3,
      navUp: 1,
      navDown: 4,
      navLeft: 2,
      navRight: 0,
      usedKeys: ['basic', 'numeric-tuning'],
      resolution: { width: 720, height: 480 },
      aspect: '4v3',
      clut: '~/0001/a.clt',
    },
  )
})

test('a feature that cannot be read is left out, and none takes no keys', () => {
  assert.deepEqual(
    featuresOf(
      new Map([
        ['nav-index', '-1'],
        ['used-key-list', 'basic arrows'],
        ['resolution', '1920x1080'],
        ['display-aspect-ratio', '21v9'],
        ['clut', 'a.clt'],
      ]),
    ),
    {},
  )
  assert.deepEqual(featuresOf(new Map([['used-key-list', 'none']])), {
    usedKeys: [],
  })
})

test('a 960x540 document fills a 16:9 box, scaled the same on both axes', () => {
  assert.deepEqual(
    planeIn({ width: 1280, height: 720 }, { width: 960, height: 540 }, '16v9'),
    {
      left: 0,
      top: 0,
      scaleX: 4 / 3,
      scaleY: 4 / 3,
    },
  )
})

test('a 720x480 document stretches to the 16:9 shape, each axis on its own', () => {
  const plane = planeIn(
    { width: 1920, height: 1080 },
    { width: 720, height: 480 },
    '16v9',
  )

  assert.equal(plane.scaleX, 1920 / 720)
  assert.equal(plane.scaleY, 1080 / 480)
})

test('a box wider or taller than the document stands it in the middle', () => {
  assert.deepEqual(
    planeIn({ width: 2000, height: 540 }, { width: 960, height: 540 }, '16v9'),
    {
      left: 520,
      top: 0,
      scaleX: 1,
      scaleY: 1,
    },
  )
  assert.deepEqual(
    planeIn({ width: 960, height: 740 }, { width: 960, height: 540 }, '16v9'),
    {
      left: 0,
      top: 100,
      scaleX: 1,
      scaleY: 1,
    },
  )
  assert.deepEqual(
    planeIn({ width: 0, height: 540 }, { width: 960, height: 540 }, '16v9'),
    {
      left: 0,
      top: 0,
      scaleX: 0,
      scaleY: 0,
    },
  )
})

test('a 4:3 document stands as a 4:3 plane in the middle of the 16:9 box', () => {
  assert.deepEqual(
    planeIn({ width: 960, height: 540 }, { width: 720, height: 480 }, '4v3'),
    {
      left: 120,
      top: 0,
      scaleX: 1,
      scaleY: 540 / 480,
    },
  )
})

test('a rectangle of the document is given on the 960x540 grid of the box', () => {
  assert.deepEqual(
    onGrid(
      { left: 480, top: 60, width: 240, height: 135 },
      { width: 960, height: 540 },
      '16v9',
    ),
    { left: 480, top: 60, width: 240, height: 135 },
  )
  assert.deepEqual(
    onGrid(
      { left: 360, top: 240, width: 360, height: 240 },
      { width: 720, height: 480 },
      '16v9',
    ),
    { left: 480, top: 270, width: 480, height: 270 },
  )
  assert.deepEqual(
    onGrid(
      { left: 0, top: 0, width: 720, height: 480 },
      { width: 720, height: 480 },
      '4v3',
    ),
    { left: 120, top: 0, width: 720, height: 540 },
  )
})

test('the ground around the video is as wide as the plane is beyond each side of its rectangle', () => {
  assert.deepEqual(
    videoHole(
      { left: 10, top: 20, width: 30, height: 40 },
      { width: 960, height: 540 },
    ),
    {
      '--bml-hole-top': '20px',
      '--bml-hole-right': '920px',
      '--bml-hole-bottom': '480px',
      '--bml-hole-left': '10px',
    },
  )
})
