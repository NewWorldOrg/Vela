import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'

import { RENDERED_PAGE_HEADER } from '@/repository/auth'

registerHooks({
  resolve(specifier, context, next) {
    return next(
      specifier === 'next/server' ? 'next/server.js' : specifier,
      context,
    )
  },
})

const { NextRequest } = await import('next/server')
const { config, middleware } = await import('@/middleware')

function passedOn(
  address: string,
  headers: Record<string, string> = {},
): Record<string, string> {
  const given = middleware(
    new NextRequest(`http://vela.test${address}`, { headers }),
  )
  const request: Record<string, string> = {}

  for (const name of given.headers
    .get('x-middleware-override-headers')
    ?.split(',') ?? []) {
    request[name] = given.headers.get(`x-middleware-request-${name}`) ?? ''
  }

  return request
}

test('the page being drawn is named by its path and query, without the payload marker', () => {
  assert.equal(
    passedOn('/guide?date=2026-10-01&_rsc=1a2b')[RENDERED_PAGE_HEADER],
    '/guide?date=2026-10-01',
  )
  assert.equal(
    passedOn('/recordings/a-recording')[RENDERED_PAGE_HEADER],
    '/recordings/a-recording',
  )
  assert.equal(passedOn('/?_rsc=1a2b')[RENDERED_PAGE_HEADER], '/')
})

test('a page name the browser sends for itself is replaced by the one asked for', () => {
  assert.equal(
    passedOn('/guide', { [RENDERED_PAGE_HEADER]: '//elsewhere.test/' })[
      RENDERED_PAGE_HEADER
    ],
    '/guide',
  )
})

test('the theme the cookie holds is passed on, and anything else is the system theme', () => {
  for (const mode of ['dark', 'light', 'system']) {
    assert.equal(
      passedOn('/', { cookie: `vela-theme-mode=${mode}` })['x-theme-mode'],
      mode,
    )
  }

  for (const headers of [
    {},
    { cookie: 'vela-theme-mode=sepia' },
    { 'x-theme-mode': 'dark' },
  ] as Record<string, string>[]) {
    assert.equal(passedOn('/', headers)['x-theme-mode'], 'system')
  }
})

test('the motion the cookie holds is passed on, and anything else is left unsaid', () => {
  for (const motion of ['still', 'moves']) {
    assert.equal(
      passedOn('/', { cookie: `vela-motion=${motion}` })['x-motion'],
      motion,
    )
  }

  for (const headers of [
    {},
    { cookie: 'vela-motion=fast' },
    { 'x-motion': 'still' },
  ] as Record<string, string>[]) {
    assert.equal(passedOn('/', headers)['x-motion'], '')
  }
})

test('what the browser sent still reaches the page beside what was added', () => {
  assert.equal(
    passedOn('/', { cookie: 'carina_session=held; vela-motion=still' }).cookie,
    'carina_session=held; vela-motion=still',
  )
})

test('every page and relay passes through, and the static files do not', () => {
  const [pattern] = config.matcher
  const matches = new RegExp(`^${pattern}$`)

  for (const path of ['/', '/guide', '/api/events', '/login']) {
    assert.ok(matches.test(path), path)
  }

  for (const path of [
    '/_next/static/chunks/main.js',
    '/_next/image',
    '/favicon.ico',
  ]) {
    assert.ok(!matches.test(path), path)
  }
})
