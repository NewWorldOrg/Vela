import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { AppRelay } from '@/lib/hybridcast/relay'
import {
  addressPointer,
  pointedMarkup,
  pointedSrcset,
  pointedStyle,
} from '@/lib/hybridcast/rewrite'

const RELAY: AppRelay = {
  origin: 'https://vela.example',
  app: '/api/live/32736-1024/data-broadcast/app/a-ticket',
  socket: '/api/live/32736-1024/data-broadcast/ws/a-ticket',
}

const FRAME = `https://vela.example${RELAY.app}?uri=${encodeURIComponent('https://hc.example.jp/home/index.html')}`

const point = addressPointer(
  RELAY,
  () => new URL('https://hc.example.jp/home/index.html'),
  () => FRAME,
)

const relayed = (target: string) =>
  `${RELAY.app}?uri=${encodeURIComponent(target)}`

test('an address written at run time is resolved against the station and pointed at the relay', () => {
  assert.equal(
    point('/data/menu0.png'),
    relayed('https://hc.example.jp/data/menu0.png'),
  )
  assert.equal(
    point('img/a.png'),
    relayed('https://hc.example.jp/home/img/a.png'),
  )
  assert.equal(
    point('https://cdn.example.jp/a.js'),
    relayed('https://cdn.example.jp/a.js'),
  )
  assert.equal(
    point('https://vela.example/data/menu0.png'),
    relayed('https://hc.example.jp/data/menu0.png'),
  )
})

test('an address the relay already has, one that names no server, a fragment and nothing are left as they are', () => {
  assert.equal(point(relayed('https://hc.example.jp/a.png')), null)
  assert.equal(
    point(`https://vela.example${relayed('https://hc.example.jp/a.png')}`),
    null,
  )
  assert.equal(point('data:image/png;base64,AAAA'), null)
  assert.equal(point('blob:https://vela.example/1'), null)
  assert.equal(point('romsound://9'), null)
  assert.equal(point('#top'), null)
  assert.equal(point('  '), null)
  assert.equal(point('javascript:void 0'), null)
})

test('the url() of a style is pointed, quoted or not, and the rest of it is kept', () => {
  assert.equal(
    pointedStyle(
      'background:url(/data/menu0.png) no-repeat; color: red',
      point,
    ),
    `background:url("${relayed('https://hc.example.jp/data/menu0.png')}") no-repeat; color: red`,
  )
  assert.equal(
    pointedStyle(`background-image: url('a.png'), url("data:,x")`, point),
    `background-image: url("${relayed('https://hc.example.jp/home/a.png')}"), url("data:,x")`,
  )
  assert.equal(pointedStyle('color: red', point), 'color: red')
})

test('each candidate of a srcset is pointed and keeps its descriptor', () => {
  assert.equal(
    pointedSrcset('a.png 1x, /b.png 2x', point),
    `${relayed('https://hc.example.jp/home/a.png')} 1x, ${relayed('https://hc.example.jp/b.png')} 2x`,
  )
})

test('markup written at run time has its addresses and its styles pointed, and its text left alone', () => {
  const markup =
    '<p class=btn><span class="img" style="background:url(/data/m.png)"><img src="/data/m.png" alt="src=/x"></span></p>' +
    '<a href=\'list.html\'>src=list</a><img srcset="a.png 2x"><audio src=romsound://9></audio>'

  assert.equal(
    pointedMarkup(markup, point),
    `<p class=btn><span class="img" style="background:url(&quot;${relayed('https://hc.example.jp/data/m.png')}&quot;)"><img src="${relayed('https://hc.example.jp/data/m.png')}" alt="src=/x"></span></p>` +
      `<a href="${relayed('https://hc.example.jp/home/list.html')}">src=list</a><img srcset="${relayed('https://hc.example.jp/home/a.png')} 2x"><audio src=romsound://9></audio>`,
  )
})

test('the receiver script the relay puts into every page it hands over is taken out of markup written at run time, which a fragment fetched by the application carries too', () => {
  const template =
    '<script src="/data-broadcast/hybridcast-receiver.js" data-hybridcast-relay="/api/live/1-2/data-broadcast/app/t" data-hybridcast-socket="/api/live/1-2/data-broadcast/ws/t" data-hybridcast-document="https://hc.example.jp/home/components/item.html"></script><p class=btn><span class=img><img></span></p>'

  assert.equal(
    pointedMarkup(template, point),
    '<p class=btn><span class=img><img></span></p>',
  )
  assert.equal(
    pointedMarkup(
      '<SCRIPT data-hybridcast-relay="/x" src="/r.js" ></SCRIPT>\n<div></div>',
      point,
    ),
    '\n<div></div>',
  )
  assert.equal(
    pointedMarkup('<script src="/data/app.js"></script>', point),
    `<script src="${relayed('https://hc.example.jp/data/app.js')}"></script>`,
  )
})
