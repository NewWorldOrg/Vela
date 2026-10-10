import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DOMParser } from '@xmldom/xmldom'

import {
  convertBml,
  parseBml,
  type BmlPage,
  type PageElement,
  type PageNode,
  type XmlParser,
} from '@/lib/bml/document'
import { pathOf, type BmlAddress } from '@/lib/bml/paths'
import type { BmlResource, ResourceKind } from '@/lib/bml/resources'

const parser = new DOMParser({
  onError: (level: string, message: string) => {
    if (level !== 'warning') {
      throw new Error(message)
    }
  },
}) as unknown as XmlParser

const ADDRESS: BmlAddress = { tag: 0x40, module: 0, name: 'startup.bml' }

function resourcesOf(
  entries: Record<string, [ResourceKind, string | Uint8Array]>,
): Map<string, BmlResource> {
  return new Map(
    Object.entries(entries).map(([path, [kind, body]]) => [
      path,
      {
        path: path.split('/').pop() ?? path,
        kind,
        body: typeof body === 'string' ? new TextEncoder().encode(body) : body,
      },
    ]),
  )
}

function read(
  source: string,
  resources: Map<string, BmlResource> = new Map(),
): BmlPage {
  const root = parseBml(source, parser)

  assert.ok(root, 'the document is well formed BML')

  const reading = convertBml(root, {
    address: ADDRESS,
    lookup: (address) => resources.get(pathOf(address)),
    image: (resource) => `blob:test/${resource.path}`,
  })

  assert.equal(reading.read, 'page')

  return (reading as { read: 'page'; page: BmlPage }).page
}

function bml(body: string, head = '', bodyStyle = ''): string {
  return `<?xml version="1.0" encoding="EUC-JP"?><!DOCTYPE bml PUBLIC "+//ARIB STD-B24:1999//DTD BML Document//JA" "bml_1_0.dtd"><?bml bml-version="100.0" ?><bml><head>${head}</head><body style="${bodyStyle}">${body}</body></bml>`
}

function elements(node: PageNode): PageElement[] {
  return node.kind === 'element'
    ? [node, ...node.children.flatMap(elements)]
    : []
}

function byId(page: BmlPage, id: string): PageElement {
  const found = elements(page.body).find((element) =>
    element.attributes.some(([name, value]) => name === 'id' && value === id),
  )

  assert.ok(found, `#${id}`)

  return found
}

function attribute(element: PageElement, name: string): string | undefined {
  return element.attributes.find(([each]) => each === name)?.[1]
}

test('the body becomes a div, and each BML element of the body the HTML element it stands for', () => {
  const page = read(
    bml(
      '<div id="d"><p id="p">a<span id="s">b</span><br/>c</p><a id="a" href="x.bml">d</a><input id="i" value="v" maxlength="4" type="text"/></div>',
    ),
  )

  assert.equal(page.body.tag, 'div')
  assert.equal(page.body.bmlTag, 'body')
  assert.equal(byId(page, 'd').tag, 'div')
  assert.equal(byId(page, 'p').tag, 'p')
  assert.equal(byId(page, 's').tag, 'span')
  assert.equal(byId(page, 'a').tag, 'a')
  assert.equal(byId(page, 'i').tag, 'input')
  assert.deepEqual(
    byId(page, 'p').children.map((child) =>
      child.kind === 'text' ? child.text : child.tag,
    ),
    ['a', 'span', 'br', 'c'],
  )
  assert.equal(attribute(byId(page, 'i'), 'value'), 'v')
  assert.equal(attribute(byId(page, 'i'), 'maxlength'), '4')
  assert.equal(attribute(byId(page, 'i'), 'data-bml-type'), 'text')
  assert.deepEqual(page.warnings, [])
})

test('an element BML does not have becomes a div and is warned of, its content kept', () => {
  const page = read(bml('<marquee id="m"><span>x</span></marquee>'))

  assert.equal(byId(page, 'm').tag, 'div')
  assert.equal(byId(page, 'm').bmlTag, 'marquee')
  assert.equal(byId(page, 'm').children.length, 1)
  assert.deepEqual(page.warnings, ['unsupported element: marquee'])
})

test('handlers and other attributes are kept only as inert data, and a link only as the path it leads to', () => {
  const page = read(
    bml(
      '<p id="p" class="a b" onclick="go()" onfocus="lit()" accesskey="B" style="left: 1px"><a id="a" href="~/0001/news.bml#top" onclick="x()">n</a><a id="away" href="https://example.com/">w</a></p>',
    ),
  )
  const p = byId(page, 'p')

  assert.deepEqual(p.attributes, [
    ['id', 'p'],
    ['class', 'a b'],
    ['data-bml-onclick', 'go()'],
    ['data-bml-onfocus', 'lit()'],
    ['data-bml-accesskey', 'B'],
  ])
  assert.equal(p.style, 'left: 1px')
  assert.equal(attribute(byId(page, 'a'), 'data-bml-href'), '/40/0001/news.bml')
  assert.equal(attribute(byId(page, 'a'), 'onclick'), undefined)
  assert.equal(attribute(byId(page, 'away'), 'data-bml-href'), undefined)
})

test('the head gives its style sheets, linked or inline, its scripts and its events, and is not drawn', () => {
  const page = read(
    bml(
      '<p id="p">x</p>',
      '<title>t</title><meta name="a" content="b"/><link rel="stylesheet" href="s.css"/><style><![CDATA[ p { left: 2px } ]]></style><script><![CDATA[ if (a < b) {} ]]></script><script src="~/0001/lib.ecm"/><bevent><beitem id="e" type="ModuleUpdated" onoccur="f()" module_ref="/40/0001"/></bevent><object id="h"/>',
    ),
    resourcesOf({ '/40/0000/s.css': ['css', 'p { top: 3px }'] }),
  )

  assert.equal(
    page.styleSheet,
    '[data-bml-tag="p"] { top: 3px }\n[data-bml-tag="p"] { left: 2px }',
  )
  assert.deepEqual(page.scripts, [
    { source: ' if (a < b) {} ' },
    { src: '/40/0001/lib.ecm' },
  ])
  assert.deepEqual(page.events, [
    {
      id: 'e',
      type: 'ModuleUpdated',
      attributes: [
        ['id', 'e'],
        ['type', 'ModuleUpdated'],
        ['onoccur', 'f()'],
        ['module_ref', '/40/0001'],
      ],
    },
  ])
  assert.deepEqual(page.warnings, ['unsupported element: object'])
  assert.equal(elements(page.body).length, 2)
})

test('a style sheet that is linked but not there is warned of', () => {
  const page = read(bml('', '<link rel="stylesheet" href="none.css"/>'))

  assert.deepEqual(page.warnings, ['missing style sheet'])
})

test('a style element in the body is still a style sheet, and a script there is not drawn', () => {
  const page = read(
    bml('<style>p { left: 4px }</style><p id="p">x</p><script>go()</script>'),
  )

  assert.equal(page.styleSheet, '[data-bml-tag="p"] { left: 4px }')
  assert.deepEqual(page.scripts, [{ source: 'go()' }])
  assert.equal(elements(page.body).length, 2)
})

test('nav-index and nav-* come from the style sheet and the style attribute, the more specific and the later winning', () => {
  const page = read(
    bml(
      '<p id="a" class="m">a</p><p id="b" class="m" style="nav-index: 9; nav-up: 0">b</p>',
      '<style>p.m { nav-index: 5 } #a { nav-index: 0; nav-down: 9 } p { nav-index: 7; nav-left: 3 }</style>',
    ),
  )

  assert.deepEqual(byId(page, 'a').nav, {
    index: 0,
    up: undefined,
    down: 9,
    left: 3,
    right: undefined,
  })
  assert.deepEqual(byId(page, 'b').nav, {
    index: 9,
    up: 0,
    down: undefined,
    left: 3,
    right: undefined,
  })
})

test('the body says the resolution, the shape and the keys, with 960x540, 16:9 and the basic and data buttons when it says nothing', () => {
  const plain = read(bml(''))
  const said = read(
    bml(
      '',
      '<style>body { resolution: 720x480 }</style>',
      'display-aspect-ratio: 4v3; used-key-list: numeric-tuning',
    ),
  )

  assert.deepEqual(plain.resolution, { width: 960, height: 540 })
  assert.equal(plain.aspect, '16v9')
  assert.deepEqual(plain.usedKeys, ['basic', 'data-button'])
  assert.deepEqual(said.resolution, { width: 720, height: 480 })
  assert.equal(said.aspect, '4v3')
  assert.deepEqual(said.usedKeys, ['numeric-tuning'])
  assert.deepEqual(read(bml('', '', 'used-key-list: none')).usedKeys, [])
})

test('a video object becomes a clear hole, and its rectangle is where it stands in the document', () => {
  const page = read(
    bml(
      '<div style="left: 100px; top: 50px"><object id="v" type="video/X-arib-mpeg2" class="tv"/></div><object type="video/X-arib-mpeg2" style="left: 0px; top: 0px; width: 10px; height: 10px"/>',
      '<style>object.tv { left: 20px; top: 10px; width: 320px; height: 180px }</style>',
    ),
  )
  const hole = byId(page, 'v')

  assert.equal(hole.tag, 'div')
  assert.equal(hole.bmlTag, 'object')
  assert.equal(attribute(hole, 'data-bml-video'), '')
  assert.equal(attribute(hole, 'data-bml-type'), 'video/X-arib-mpeg2')
  assert.deepEqual(page.videoRect, {
    left: 120,
    top: 60,
    width: 320,
    height: 180,
  })
})

test('a video object reaching past the plane is cut to it, and one without a size gives no rectangle', () => {
  const past = read(
    bml(
      '<object type="video/X-arib-mpeg2" style="left: 800px; top: 400px; width: 320px; height: 180px"/>',
    ),
  )
  const sizeless = read(
    bml('<object type="video/X-arib-mpeg2" style="left: 10px"/>'),
  )

  assert.deepEqual(past.videoRect, {
    left: 800,
    top: 400,
    width: 160,
    height: 140,
  })
  assert.equal(sizeless.videoRect, null)
  assert.deepEqual(sizeless.warnings, ['video object without a size'])
  assert.equal(read(bml('<p>x</p>')).videoRect, null)
})

test('an image object and an img element draw the resource as a blob, and sound is left out', () => {
  const page = read(
    bml(
      '<object id="j" type="image/jpeg" data="a.jpg" style="left: 1px"/><object id="p" type="image/X-arib-png" data="~/0001/b.png"/><img id="i" src="a.jpg"/><object type="audio/X-arib-aiff" data="c.aif"/>',
    ),
    resourcesOf({
      '/40/0000/a.jpg': ['jpeg', new Uint8Array([0xff, 0xd8])],
      '/40/0001/b.png': ['png', new Uint8Array([0x89])],
    }),
  )

  assert.equal(byId(page, 'j').tag, 'img')
  assert.equal(byId(page, 'j').bmlTag, 'object')
  assert.equal(attribute(byId(page, 'j'), 'src'), 'blob:test/a.jpg')
  assert.equal(byId(page, 'j').style, 'left: 1px')
  assert.equal(attribute(byId(page, 'p'), 'src'), 'blob:test/b.png')
  assert.equal(byId(page, 'i').tag, 'img')
  assert.equal(attribute(byId(page, 'i'), 'src'), 'blob:test/a.jpg')
  assert.equal(elements(page.body).length, 4)
  assert.deepEqual(page.warnings, [])
})

test('an image that is not there, is not a picture, or is a kind not drawn holds its place as a div with a warning', () => {
  const page = read(
    bml(
      '<object id="gone" type="image/jpeg" data="none.jpg"/><object id="text" type="image/jpeg" data="s.css"/><object id="mng" type="image/X-arib-mng" data="m.mng"/><object id="other" type="application/X-arib-x"/>',
    ),
    resourcesOf({
      '/40/0000/s.css': ['css', ''],
      '/40/0000/m.mng': ['binary', ''],
    }),
  )

  for (const id of ['gone', 'text', 'mng', 'other']) {
    assert.equal(byId(page, id).tag, 'div', id)
  }

  assert.deepEqual(page.warnings, [
    'missing image',
    'unsupported image',
    'unsupported object: image/x-arib-mng',
    'unsupported object: application/x-arib-x',
  ])
})

test('colours are read from the document’s own lookup table, and the fixed colours otherwise', () => {
  const page = read(
    bml(
      '<p id="p" style="color-index: 128; background-color-index: 1">x</p>',
      '<style>p { color-index: 7 }</style>',
      'clut: url(a.clt)',
    ),
    resourcesOf({
      '/40/0000/a.clt': [
        'binary',
        Uint8Array.from([0xc8, 128, 128, 9, 8, 7, 255]),
      ],
    }),
  )

  assert.equal(
    byId(page, 'p').style,
    'color: rgb(9 8 7); background-color: rgb(255 0 0); --bml-background: rgb(255 0 0)',
  )
  assert.equal(
    page.styleSheet,
    '[data-bml-tag="p"] { color: rgb(255 255 255) }',
  )
})

test('a lookup table that is not there leaves the fixed colours, with a warning', () => {
  const page = read(
    bml('<p id="p" style="color-index: 128">x</p>', '', 'clut: url(none.clt)'),
  )

  assert.equal(byId(page, 'p').style, 'color: rgb(0 0 0 / 0)')
  assert.deepEqual(page.warnings, ['missing colour table'])
})

test('a property the converter does not take is warned of, once', () => {
  const page = read(
    bml('<p style="z-index: 1">a</p><p style="z-index: 2">b</p>'),
  )

  assert.deepEqual(page.warnings, ['unsupported property: z-index'])
})

test('a document that is not well formed, or not BML, is not read', () => {
  assert.equal(parseBml('<bml><body><p></bml>', parser), null)
  assert.equal(parseBml('<html><body/></html>', parser), null)
  assert.equal(parseBml('', parser), null)
  assert.equal(parseBml('<bml><parsererror/><body/></bml>', parser), null)
})

test('a BML document with no body is malformed', () => {
  const root = parseBml('<bml><head/></bml>', parser)

  assert.ok(root)
  assert.deepEqual(
    convertBml(root, {
      address: ADDRESS,
      lookup: () => undefined,
      image: () => null,
    }),
    { read: 'malformed', why: 'no body' },
  )
})

test('an element named after something every object inherits is still an element BML does not have', () => {
  const page = read(
    bml(
      '<constructor id="c">x</constructor><toString id="t"/>',
      '',
      'resolution: constructor',
    ),
  )

  assert.equal(byId(page, 'c').tag, 'div')
  assert.equal(byId(page, 't').tag, 'div')
  assert.deepEqual(page.resolution, { width: 960, height: 540 })
  assert.deepEqual(page.warnings, [
    'unsupported element: constructor',
    'unsupported element: tostring',
  ])
})
