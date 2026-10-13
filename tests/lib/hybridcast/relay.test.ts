import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  intendedTarget,
  relayedAddress,
  relayedTarget,
  routeRequest,
  routeSocket,
  type AppRelay,
} from '@/lib/hybridcast/relay'

const RELAY: AppRelay = {
  origin: 'https://vela.example',
  app: '/api/live/32736-1024/data-broadcast/app/a-ticket',
  socket: '/api/live/32736-1024/data-broadcast/ws/a-ticket',
}

const DOCUMENT = new URL('http://hc.example.test/p/index.html')

const inside = (address: string) =>
  /^https?:\/\/([a-z0-9-]+\.)*example\.(test|jp)\//.test(address)

function relayed(target: string): string {
  return `${RELAY.app}?uri=${encodeURIComponent(target)}`
}

function relayedHere(target: string): string {
  return `${RELAY.origin}${relayed(target)}`
}

test('the relay address carries the URL as uri and keeps the fragment after it, as Carina writes it', () => {
  assert.equal(
    relayedAddress(
      RELAY.app,
      new URL('http://hc.example.test/p/a.json?x=1#top'),
    ),
    `${relayed('http://hc.example.test/p/a.json?x=1')}#top`,
  )
})

test('a relay address names the broadcaster URL it relays, and nothing else is one', () => {
  const address = new URL(
    `https://vela.example${relayed('http://hc.example.test/p/next.html')}#part`,
  )

  assert.equal(
    relayedTarget(address, RELAY)?.href,
    'http://hc.example.test/p/next.html#part',
  )
  assert.equal(
    relayedTarget(
      new URL('https://vela.example/api/live/x?uri=http%3A%2F%2Fa.test%2F'),
      RELAY,
    ),
    null,
  )
  assert.equal(
    relayedTarget(
      new URL(`https://elsewhere.test${relayed('http://a.test/')}`),
      RELAY,
    ),
    null,
  )
  assert.equal(
    relayedTarget(
      new URL(`https://vela.example${relayed('javascript:alert(1)')}`),
      RELAY,
    ),
    null,
  )
})

test('an address the browser resolved against the frame is taken as the application meant it on the broadcaster', () => {
  const at = (path: string) =>
    intendedTarget(new URL(path, 'https://vela.example'), RELAY, DOCUMENT).href

  assert.equal(
    at('/common/jquery.js'),
    'http://hc.example.test/common/jquery.js',
  )
  assert.equal(
    at('/api/live/32736-1024/data-broadcast/app/next.html?a=1'),
    'http://hc.example.test/p/next.html?a=1',
  )
  assert.equal(
    at(relayed('https://hc.example.jp/home/')),
    'https://hc.example.jp/home/',
  )
  assert.equal(
    intendedTarget(new URL('https://hc.example.jp/x'), RELAY, DOCUMENT).href,
    'https://hc.example.jp/x',
  )
})

test('a request inside the boundary goes through the relay, resolved against the document on the broadcaster', () => {
  assert.deepEqual(routeRequest('/common/data.json', RELAY, DOCUMENT, inside), {
    to: 'relay',
    url: relayedHere('http://hc.example.test/common/data.json'),
  })
  assert.deepEqual(routeRequest('list.json?page=2', RELAY, DOCUMENT, inside), {
    to: 'relay',
    url: relayedHere('http://hc.example.test/p/list.json?page=2'),
  })
  assert.deepEqual(
    routeRequest('https://hc.example.jp/a', RELAY, DOCUMENT, inside),
    { to: 'relay', url: relayedHere('https://hc.example.jp/a') },
  )
  assert.deepEqual(
    routeRequest(
      new URL(
        `https://vela.example${relayed('http://hc.example.test/img.png')}`,
      ),
      RELAY,
      DOCUMENT,
      inside,
    ),
    { to: 'relay', url: relayedHere('http://hc.example.test/img.png') },
  )
})

test('a request outside the boundary or for a scheme with a server other than the web is refused, and one for no server is left to the browser', () => {
  assert.deepEqual(
    routeRequest('https://elsewhere.test/', RELAY, DOCUMENT, inside),
    {
      to: 'refused',
    },
  )
  assert.deepEqual(
    routeRequest('ftp://hc.example.test/', RELAY, DOCUMENT, inside),
    {
      to: 'refused',
    },
  )
  assert.deepEqual(routeRequest('data:text/plain,1', RELAY, DOCUMENT, inside), {
    to: 'browser',
  })
  assert.deepEqual(
    routeRequest('blob:https://vela.example/1', RELAY, DOCUMENT, inside),
    { to: 'browser' },
  )
  assert.deepEqual(routeRequest('http://[', RELAY, DOCUMENT, inside), {
    to: 'refused',
  })
})

test('a WebSocket inside the boundary is carried by the relay on the same scheme of Vela, and one outside is refused', () => {
  const carried = (target: string) =>
    `wss://vela.example${RELAY.socket}?uri=${encodeURIComponent(target)}`

  assert.deepEqual(
    routeSocket('wss://hc.example.test/live', RELAY, DOCUMENT, inside),
    {
      to: 'relay',
      url: carried('wss://hc.example.test/live'),
    },
  )
  assert.deepEqual(routeSocket('/live', RELAY, DOCUMENT, inside), {
    to: 'relay',
    url: carried('ws://hc.example.test/live'),
  })
  assert.deepEqual(
    routeSocket('wss://vela.example/live', RELAY, DOCUMENT, inside),
    {
      to: 'relay',
      url: carried('ws://hc.example.test/live'),
    },
  )
  assert.deepEqual(
    routeSocket('wss://elsewhere.test/', RELAY, DOCUMENT, inside),
    {
      to: 'refused',
    },
  )
})
