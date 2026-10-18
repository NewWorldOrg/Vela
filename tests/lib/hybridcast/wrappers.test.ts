import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  routeRequest,
  routeSocket,
  type AppRelay,
} from '@/lib/hybridcast/relay'
import {
  relayedBeacon,
  relayedFetch,
  relayedWebSocket,
  relayedXhr,
} from '@/lib/hybridcast/wrappers'

const RELAY: AppRelay = {
  origin: 'https://vela.example',
  app: '/api/live/32736-1024/data-broadcast/app/a-ticket',
  socket: '/api/live/32736-1024/data-broadcast/ws/a-ticket',
}

const DOCUMENT = new URL('http://hc.example.test/p/index.html')

const inside = (address: string) =>
  address.startsWith('http://hc.example.test/')

const route = (written: string | URL) =>
  routeRequest(written, RELAY, DOCUMENT, inside)

function relayed(target: string): string {
  return `${RELAY.app}?uri=${encodeURIComponent(target)}`
}

function relayedHere(target: string): string {
  return `${RELAY.origin}${relayed(target)}`
}

test('fetch asks the relay for what is inside the boundary, and fails without asking anything for what is outside', async () => {
  const asked: string[] = []
  const wrapped = relayedFetch(async (input) => {
    asked.push(
      typeof input === 'string'
        ? input
        : String((input as Request).url ?? input),
    )

    return new Response('ok')
  }, route)

  await wrapped('/common/data.json')
  await wrapped(new Request('https://vela.example/p/list.json'))
  await wrapped('data:text/plain,1')
  await assert.rejects(wrapped('https://elsewhere.test/track'), TypeError)
  await assert.rejects(wrapped('https://vela.example.evil/'), TypeError)

  assert.deepEqual(asked, [
    relayedHere('http://hc.example.test/common/data.json'),
    relayedHere('http://hc.example.test/p/list.json'),
    'data:text/plain,1',
  ])
})

class FakeXhr extends EventTarget {
  static opened: string[] = []

  static sent = 0

  open(_method: string, url: string | URL): void {
    FakeXhr.opened.push(String(url))
  }

  send(): void {
    FakeXhr.sent += 1
  }

  #credentials = false

  get withCredentials(): boolean {
    return this.#credentials
  }

  set withCredentials(value: boolean) {
    this.#credentials = value
  }

  get readyState(): number {
    return 1
  }

  get status(): number {
    return 200
  }
}

test('XMLHttpRequest opens on the relay inside the boundary, and outside it sends nothing and ends as a request that reached nothing', async () => {
  const Wrapped = relayedXhr(FakeXhr as unknown as typeof XMLHttpRequest, route)
  const inBounds = new Wrapped()

  inBounds.open('GET', 'list.json')
  inBounds.send()

  assert.deepEqual(FakeXhr.opened, [
    relayedHere('http://hc.example.test/p/list.json'),
  ])
  assert.equal(FakeXhr.sent, 1)

  const outside = new Wrapped()
  const heard: string[] = []

  outside.addEventListener('error', () => heard.push('error'))
  outside.addEventListener('loadend', () => heard.push('loadend'))
  outside.open('GET', 'https://elsewhere.test/beacon')
  outside.send()

  assert.equal(FakeXhr.sent, 1)
  assert.equal(FakeXhr.opened.at(-1), 'data:,')
  await new Promise((resolve) => setTimeout(resolve, 5))
  assert.deepEqual(heard, ['error', 'loadend'])
  assert.equal(outside.readyState, 4)
  assert.equal(outside.status, 0)

  const blocking = new Wrapped()

  blocking.open('GET', 'https://elsewhere.test/', false)
  assert.throws(() => blocking.send(), { name: 'NetworkError' })
})

class FakeSocket {
  static opened: string[] = []

  constructor(url: string | URL) {
    FakeSocket.opened.push(String(url))
  }
}

test('a WebSocket is carried by the relay inside the boundary and refused outside it', () => {
  const Wrapped = relayedWebSocket(
    FakeSocket as unknown as typeof WebSocket,
    (written) => routeSocket(written, RELAY, DOCUMENT, inside),
  )

  new Wrapped('ws://hc.example.test/live')

  assert.deepEqual(FakeSocket.opened, [
    `wss://vela.example${RELAY.socket}?uri=${encodeURIComponent('ws://hc.example.test/live')}`,
  ])
  assert.throws(() => new Wrapped('wss://elsewhere.test/'), {
    name: 'SecurityError',
  })
})

test('fetch sends no credentials, whatever the application asks', async () => {
  const sent: (RequestCredentials | undefined)[] = []
  const wrapped = relayedFetch(async (input, init) => {
    sent.push(init?.credentials)

    return new Response('ok')
  }, route)

  await wrapped('/common/data.json', { credentials: 'include' })
  await wrapped(
    new Request('https://vela.example/p/list.json', { credentials: 'include' }),
  )
  await wrapped('list.json')

  assert.deepEqual(sent, ['omit', 'omit', 'omit'])
})

test('XMLHttpRequest sends no credentials, whatever the application sets', () => {
  const Wrapped = relayedXhr(FakeXhr as unknown as typeof XMLHttpRequest, route)
  const request = new Wrapped()

  request.withCredentials = true
  request.open('GET', 'list.json')
  request.withCredentials = true

  assert.equal(request.withCredentials, false)
  request.send()
  assert.equal(request.withCredentials, false)
})

test('a beacon is sent through the relay inside the boundary and not sent outside it', () => {
  const sent: string[] = []
  const beacon = relayedBeacon((url) => sent.push(String(url)) > 0, route)

  assert.equal(beacon('/beacon?a=1'), true)
  assert.equal(beacon('https://elsewhere.test/'), false)
  assert.deepEqual(sent, [relayedHere('http://hc.example.test/beacon?a=1')])
})
