import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  navigateTo,
  stationLocation,
  type StationNavigation,
} from '@/lib/hybridcast/location'
import type { AppRelay } from '@/lib/hybridcast/relay'

const RELAY: AppRelay = {
  origin: 'https://vela.example',
  app: '/api/live/32736-1024/data-broadcast/app/a-ticket',
  socket: '/api/live/32736-1024/data-broadcast/ws/a-ticket',
}

function relayed(target: string): string {
  return `${RELAY.app}?uri=${encodeURIComponent(target)}`
}

function navigation(at = 'http://hc.example.test/p/index.html?a=1#top') {
  const done: string[] = []
  let station = new URL(at)
  const nav: StationNavigation = {
    relay: RELAY,
    station: () => station,
    inside: (address) =>
      /^https?:\/\/([a-z0-9-]+\.)*example\.(test|jp)\//.test(address),
    go: (target, how) => done.push(`${how} ${target.href}`),
    hash: (hash) => {
      done.push(`hash ${hash}`)
      station = new URL(`${station.href.split('#')[0]}${hash}`)
    },
    reload: () => done.push('reload'),
    leave: (to) => done.push(`leave ${to.href}`),
  }

  return { nav, done, location: stationLocation(nav) }
}

test('the location reads as the station URL the frame stands for, not the frame', () => {
  const { location } = navigation()

  assert.equal(location.href, 'http://hc.example.test/p/index.html?a=1#top')
  assert.equal(location.protocol, 'http:')
  assert.equal(location.host, 'hc.example.test')
  assert.equal(location.hostname, 'hc.example.test')
  assert.equal(location.port, '')
  assert.equal(location.pathname, '/p/index.html')
  assert.equal(location.search, '?a=1')
  assert.equal(location.hash, '#top')
  assert.equal(location.origin, 'http://hc.example.test')
  assert.equal(location.toString(), location.href)
  assert.equal(`${location}`, location.href)
  assert.equal(String(location).split('.')[0], 'http://hc')
})

test('a port the station names is read as the station has it', () => {
  const { location } = navigation('https://hc.example.test:8443/x')

  assert.equal(location.host, 'hc.example.test:8443')
  assert.equal(location.port, '8443')
  assert.equal(location.origin, 'https://hc.example.test:8443')
})

test('setting href, assign and replace go to the address resolved against the station, through the relay inside the boundary', () => {
  const { location, done } = navigation()

  location.href = 'next.html'
  location.assign('/common/top.html')
  location.replace('https://hc.example.jp/home/')

  assert.deepEqual(done, [
    'assign http://hc.example.test/p/next.html',
    'assign http://hc.example.test/common/top.html',
    'replace https://hc.example.jp/home/',
  ])
})

test('an address outside the boundary leaves for the documents, and one with no server is not followed', () => {
  const { location, done } = navigation()

  location.href = 'https://elsewhere.test/page?id=1'
  location.assign('javascript:void 0')

  assert.deepEqual(done, ['leave https://elsewhere.test/page?id=1'])
})

test('setting the hash, or an address that differs only in it, stays in the document', () => {
  const { location, done } = navigation()

  location.hash = 'part'
  location.href = '#other'

  assert.deepEqual(done, ['hash #part', 'hash #other'])
  assert.equal(location.hash, '#other')
})

test('setting a part of the address goes to the station with that part changed', () => {
  const { location, done } = navigation()

  location.pathname = '/p/list.html'
  location.search = 'page=2'
  location.hostname = 'www.example.test'

  assert.deepEqual(done, [
    'assign http://hc.example.test/p/list.html?a=1#top',
    'assign http://hc.example.test/p/index.html?page=2#top',
    'assign http://www.example.test/p/index.html?a=1#top',
  ])
})

test('reload reloads the frame on the relay', () => {
  const { location, done } = navigation()

  location.reload()
  assert.deepEqual(done, ['reload'])
})

test('assigning the location itself goes where the address says, as setting href does', () => {
  const { nav, done } = navigation()

  navigateTo(nav, '/p/other.html', 'assign')
  navigateTo(nav, new URL('https://elsewhere.test/'), 'assign')

  assert.deepEqual(done, [
    'assign http://hc.example.test/p/other.html',
    'leave https://elsewhere.test/',
  ])
})

test('an address the relay wrote, as a link of the document reads it, goes to the broadcaster URL it names, inside the boundary or out of it', () => {
  const { location, done } = navigation()

  location.href = `${RELAY.origin}${relayed('http://hc.example.test/p/next.html')}`
  location.assign(relayed('https://hc.example.jp/home/?a=1'))
  location.replace(`${RELAY.origin}${relayed('https://elsewhere.test/page')}`)

  assert.deepEqual(done, [
    'assign http://hc.example.test/p/next.html',
    'assign https://hc.example.jp/home/?a=1',
    'leave https://elsewhere.test/page',
  ])
})

test('an address the relay wrote that differs from the station only in its fragment stays in the document', () => {
  const { location, done } = navigation()

  location.href = `${RELAY.origin}${relayed('http://hc.example.test/p/index.html?a=1')}#part`

  assert.deepEqual(done, ['hash #part'])
})

test("an address on Vela's origin other than the relay is the same path on the broadcaster, taken beside the document when it lies beside the relay", () => {
  const { location, done } = navigation()

  location.href = `${RELAY.origin}/common/top.html`
  location.href = `${RELAY.origin}/api/live/32736-1024/data-broadcast/app/next.html`

  assert.deepEqual(done, [
    'assign http://hc.example.test/common/top.html',
    'assign http://hc.example.test/p/next.html',
  ])
})
