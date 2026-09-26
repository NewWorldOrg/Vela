import assert from 'node:assert/strict'
import { test, type TestContext } from 'node:test'

import {
  getSignInOptions,
  loginHref,
  oidcStartHref,
  returnPathWithin,
  signIn,
  signOut,
  signedOutMethod,
} from '@/repository/auth'

const ORIGIN = 'https://vela.test'

const API = 'http://carina.test'

interface Asked {
  url: string
  init?: RequestInit
}

function answering(
  t: TestContext,
  reply: (asked: Asked) => Response | Promise<Response>,
): Asked[] {
  const asked: Asked[] = []

  t.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL, init?: RequestInit) => {
      const one = { url: String(input), init }

      asked.push(one)

      return reply(one)
    },
  )

  return asked
}

function unreachable(t: TestContext): void {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('fetch failed')
  })
}

function withBaseUrl(t: TestContext, value: string | undefined): void {
  const before = process.env.CARINA_API_BASE_URL

  if (value === undefined) {
    delete process.env.CARINA_API_BASE_URL
  } else {
    process.env.CARINA_API_BASE_URL = value
  }

  t.after(() => {
    if (before === undefined) {
      delete process.env.CARINA_API_BASE_URL
    } else {
      process.env.CARINA_API_BASE_URL = before
    }
  })
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

test('a path inside the app is where the sign-in returns to', () => {
  for (const path of [
    '/',
    '/guide',
    '/guide?date=2026-08-08',
    '/recordings/recording-1#chapter-2',
    '/settings/authentication',
    '/search?q=%E3%83%8B%E3%83%A5%E3%83%BC%E3%82%B9',
    '/login-history',
    '/logins',
  ]) {
    assert.equal(returnPathWithin(path), path)
  }
})

test('a missing or empty return path goes home', () => {
  assert.equal(returnPathWithin(undefined), '/')
  assert.equal(returnPathWithin(''), '/')
})

test('an absolute address, on any scheme, goes home', () => {
  for (const target of [
    'https://example.test/',
    'http://example.test/guide',
    'https:example.test',
    'http:/example.test',
    'ftp://example.test/',
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
  ]) {
    assert.equal(returnPathWithin(target), '/', target)
  }
})

test('a protocol-relative address goes home', () => {
  for (const target of [
    '//example.test',
    '//example.test/guide',
    '///example.test',
    '//@example.test',
  ]) {
    assert.equal(returnPathWithin(target), '/', target)
  }
})

test('a backslash anywhere goes home, since a browser reads it as a slash', () => {
  for (const target of [
    '/\\example.test',
    '\\\\example.test',
    '\\/example.test',
    '/\\/example.test',
    '/guide\\..\\..\\example.test',
  ]) {
    assert.equal(returnPathWithin(target), '/', target)
  }
})

test('a control character a browser would strip out of the address goes home', () => {
  for (const target of [
    '/\t/example.test',
    '/\n/example.test',
    '/\r/example.test',
    '/\r\n/example.test',
    '/\u0000/example.test',
    '/\u001f/example.test',
    '/\u007f/example.test',
  ]) {
    assert.equal(returnPathWithin(target), '/', JSON.stringify(target))
  }
})

test('a path that does not start at the root of the app goes home', () => {
  for (const target of [
    'guide',
    './guide',
    '../guide',
    'example.test',
    ' /guide',
    '?next=/guide',
    '#guide',
    '%2F%2Fexample.test',
    '%2Fguide',
  ]) {
    assert.equal(returnPathWithin(target), '/', target)
  }
})

test('the sign-in screen itself is never where a sign-in returns to', () => {
  for (const target of [
    '/login',
    '/login?next=/guide',
    '/login/',
    '/login/anything',
    '/LOGIN',
    '/Login?next=/guide',
  ]) {
    assert.equal(returnPathWithin(target), '/', target)
  }
})

test('whatever a return path is let through as, it stays on the origin it is followed from', () => {
  for (const target of [
    '/%2F%2Fexample.test',
    '/%2f%2fexample.test',
    '/%5C%5Cexample.test',
    '/%09/example.test',
    '/..//example.test',
    '/.//example.test',
    '/javascript:alert(1)',
    '/guide?next=//example.test',
    '/guide#//example.test',
  ]) {
    const kept = returnPathWithin(target)

    assert.equal(kept, target)
    assert.equal(new URL(kept, ORIGIN).origin, ORIGIN, target)
  }
})

test('the sign-in link carries the return path encoded, or home when it may not be kept', () => {
  assert.equal(
    loginHref('/guide?date=2026-08-08&channel=1'),
    '/login?next=%2Fguide%3Fdate%3D2026-08-08%26channel%3D1',
  )
  assert.equal(loginHref('//example.test'), '/login?next=%2F')
  assert.equal(loginHref('/login?next=/guide'), '/login?next=%2F')
  assert.equal(loginHref(undefined), '/login?next=%2F')
})

test('the identity provider link carries the return path encoded', () => {
  assert.equal(
    oidcStartHref('/guide?date=2026-08-08'),
    '/api/auth/oidc/start?next=%2Fguide%3Fdate%3D2026-08-08',
  )
})

test('a sign-out is by the identity provider only when it says so', () => {
  assert.equal(signedOutMethod('oidc'), 'oidc')

  for (const value of ['local', 'OIDC', 'saml', '', undefined]) {
    assert.equal(signedOutMethod(value), 'local', String(value))
  }
})

test('without an API to ask, only the local sign-in is offered', async (t) => {
  withBaseUrl(t, undefined)

  const asked = answering(t, () => json({}))

  assert.deepEqual(await getSignInOptions(), { state: 'local-only' })
  assert.deepEqual(asked, [])
})

test('the identity provider is offered by name, and as reachable only when the API says so', async (t) => {
  withBaseUrl(t, API)

  const asked = answering(t, () =>
    json({
      status: true,
      message: '',
      data: {
        identityProvider: true,
        providerName: 'Example IdP',
        reach: 'reachable',
      },
    }),
  )

  assert.deepEqual(await getSignInOptions(), {
    state: 'identity-provider',
    providerName: 'Example IdP',
    reachable: true,
  })
  assert.equal(asked[0].url, `${API}/api/auth/sign-in-options`)
  assert.equal(asked[0].init?.cache, 'no-store')
  assert.deepEqual(asked[0].init?.headers, { accept: 'application/json' })
})

test('an identity provider without a name, or not known to be reachable, is still offered', async (t) => {
  withBaseUrl(t, API)

  for (const [providerName, reach] of [
    ['', 'unreachable'],
    [null, 'unknown'],
    [7, undefined],
    [undefined, 'someReachThisBuildDoesNotKnow'],
  ]) {
    t.mock.restoreAll()
    answering(t, () =>
      json({
        status: true,
        message: '',
        data: { identityProvider: true, providerName, reach },
      }),
    )

    assert.deepEqual(await getSignInOptions(), {
      state: 'identity-provider',
      providerName: null,
      reachable: false,
    })
  }
})

test('anything but a plain yes to an identity provider offers the local sign-in only', async (t) => {
  withBaseUrl(t, API)

  for (const body of [
    { status: true, message: '', data: { identityProvider: false } },
    { status: true, message: '', data: { identityProvider: 'true' } },
    { status: true, message: '', data: null },
    { status: true, message: '' },
    { identityProvider: true },
    null,
    [],
    'identityProvider',
  ]) {
    t.mock.restoreAll()
    answering(t, () => json(body))

    assert.deepEqual(
      await getSignInOptions(),
      { state: 'local-only' },
      JSON.stringify(body),
    )
  }
})

test('an API that refuses, fails or answers with no JSON offers the local sign-in only', async (t) => {
  withBaseUrl(t, API)

  for (const reply of [
    () =>
      json(
        {
          status: false,
          message: 'refused',
          data: { identityProvider: true },
        },
        500,
      ),
    () => new Response('not json', { status: 200 }),
  ]) {
    t.mock.restoreAll()
    answering(t, reply)

    assert.deepEqual(await getSignInOptions(), { state: 'local-only' })
  }

  t.mock.restoreAll()
  unreachable(t)

  assert.deepEqual(await getSignInOptions(), { state: 'local-only' })
})

test('a sign-in posts the credentials to the app and is signed in on an ok answer', async (t) => {
  const asked = answering(t, () => json({ status: true, message: '' }))

  assert.deepEqual(
    await signIn({ username: 'viewer', password: 'correct horse' }),
    { state: 'signed-in' },
  )
  assert.equal(asked[0].url, '/api/auth/login')
  assert.equal(asked[0].init?.method, 'POST')
  assert.equal(asked[0].init?.credentials, 'same-origin')
  assert.deepEqual(JSON.parse(String(asked[0].init?.body)), {
    username: 'viewer',
    password: 'correct horse',
  })
})

test('a sign-in the API turns down is refused', async (t) => {
  answering(t, () =>
    json({ status: false, message: 'refused', data: null }, 401),
  )

  assert.deepEqual(await signIn({ username: 'viewer', password: 'wrong' }), {
    state: 'refused',
  })
})

test('a sign-in held back for trying too often says how long to wait', async (t) => {
  for (const [header, seconds] of [
    ['30', 30],
    ['1', 1],
    [undefined, 60],
    ['0', 60],
    ['-5', 60],
    ['soon', 60],
    ['Wed, 21 Oct 2026 07:28:00 GMT', 60],
  ] as const) {
    t.mock.restoreAll()
    answering(
      t,
      () =>
        new Response(null, {
          status: 429,
          headers: header === undefined ? {} : { 'retry-after': header },
        }),
    )

    assert.deepEqual(
      await signIn({ username: 'viewer', password: 'wrong' }),
      { state: 'rate-limited', retryAfterSeconds: seconds },
      String(header),
    )
  }
})

test('a sign-in the API could not take, or that never reached it, is unavailable', async (t) => {
  for (const status of [400, 403, 500, 502, 503]) {
    t.mock.restoreAll()
    answering(t, () => json({ status: false, message: 'refused' }, status))

    assert.deepEqual(
      await signIn({ username: 'viewer', password: 'wrong' }),
      { state: 'unavailable' },
      String(status),
    )
  }

  t.mock.restoreAll()
  unreachable(t)

  assert.deepEqual(await signIn({ username: 'viewer', password: 'wrong' }), {
    state: 'unavailable',
  })
})

test('a sign-out is done only when the API says so', async (t) => {
  const asked = answering(t, () => json({ status: true, message: '' }))

  assert.equal(await signOut(), true)
  assert.equal(asked[0].url, '/api/auth/logout')
  assert.equal(asked[0].init?.method, 'POST')
  assert.equal(asked[0].init?.credentials, 'same-origin')

  t.mock.restoreAll()
  answering(t, () => json({ status: false, message: 'refused' }, 500))
  assert.equal(await signOut(), false)

  t.mock.restoreAll()
  unreachable(t)
  assert.equal(await signOut(), false)
})
