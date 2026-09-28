import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

interface Sent {
  method: string
  path: string
  body?: unknown
}

interface Reply {
  status: number
  body?: unknown
}

const sent: Sent[] = []

let reply: Reply = { status: 200 }

const answer = (method: string, path: string, init?: { body?: unknown }) => {
  sent.push(
    init?.body === undefined
      ? { method, path }
      : { method, path, body: init.body },
  )

  const { status, body } = reply

  return {
    data: status < 300 ? body : undefined,
    error: status < 300 ? undefined : body,
    response: { status, ok: status < 300 },
  }
}

mock.module('@/repository/client/carina', {
  namedExports: {
    carinaClient: () => ({
      GET: async (path: string) => answer('GET', path),
      PUT: async (path: string, init?: { body?: unknown }) =>
        answer('PUT', path, init),
    }),
    revalidatingCarinaClient: () => {
      throw new Error('the authentication settings do not revalidate')
    },
  },
})

const { getOidcConfig, saveOidcConfig } = await import('@/repository/oidc')

const envelope = (data: unknown, message = '') => ({
  status: data !== null,
  message,
  data,
})

function answering(status: number, body?: unknown): void {
  sent.length = 0
  reply = { status, body }
}

const HELD = {
  configured: true,
  discoveryUrl: 'https://id.example.test/.well-known/openid-configuration',
  clientId: 'vela-client',
  secretHeld: true,
  allowedGroups: ['viewers'],
  allowedHostedDomains: ['example.test'],
  admitsEveryone: false,
  reach: 'reachable',
  redirectUri: 'https://vela.example.test/api/auth/oidc/callback',
  redirectUriGuessed: false,
}

const CHANGE = {
  discoveryUrl: 'https://id.example.test/.well-known/openid-configuration',
  clientId: 'vela-client',
  allowedGroups: ['viewers', 'operators'],
  allowedHostedDomains: [],
}

test('the settings on screen are the ones the API holds', async () => {
  answering(200, envelope(HELD))

  assert.deepEqual(await getOidcConfig(), {
    configured: true,
    discoveryUrl: HELD.discoveryUrl,
    clientId: 'vela-client',
    secretHeld: true,
    allowedGroups: ['viewers'],
    allowedHostedDomains: ['example.test'],
    admitsEveryone: false,
    reach: 'reachable',
    redirectUri: HELD.redirectUri,
  })
  assert.deepEqual(sent, [{ method: 'GET', path: '/api/auth/oidc-config' }])
})

test('settings never made are read as empty fields, not as the word null', async () => {
  answering(
    200,
    envelope({
      ...HELD,
      configured: false,
      discoveryUrl: null,
      clientId: null,
      secretHeld: false,
      reach: 'notConfigured',
    }),
  )

  const held = await getOidcConfig()

  assert.equal(held.discoveryUrl, '')
  assert.equal(held.clientId, '')
})

test('settings the API will not give are thrown, not drawn as unset', async () => {
  answering(503, envelope(null, 'down'))

  await assert.rejects(() => getOidcConfig(), /answered 503/)
})

test('a change is sent whole, and a secret left blank keeps the one held', async () => {
  answering(200, envelope(HELD))

  assert.deepEqual(await saveOidcConfig(CHANGE), { state: 'ok' })
  assert.deepEqual(sent, [
    {
      method: 'PUT',
      path: '/api/auth/oidc-config',
      body: { ...CHANGE, clientSecret: null },
    },
  ])
})

test('a secret typed in is sent as it was typed', async () => {
  answering(200, envelope(HELD))

  await saveOidcConfig({ ...CHANGE, clientSecret: 'a-new-secret' })

  assert.equal(
    (sent[0]?.body as { clientSecret?: unknown }).clientSecret,
    'a-new-secret',
  )
})

test("a change the API refuses comes back with the reason in the screen's words, not the sentence the API wrote", async () => {
  for (const [refusal, said] of [
    ['secretRequired', '初めての保存には client secret が必要です。'],
    [
      'discoveryUrlInvalid',
      'discovery URL が https で始まる URL ではないか、長すぎます。',
    ],
    ['clientIdInvalid', 'client ID が空か、長すぎます。'],
    [
      'restrictionInvalid',
      '許可グループか許可ドメインに、受け付けられない値が含まれています。',
    ],
    [
      'providerUnreachable',
      'discovery の文書を読めなかったため、何も保存されていません。表示されている redirect URI を IdP に登録してから、discovery URL を確かめてください。',
    ],
  ] as const) {
    answering(
      400,
      envelope({ refusal }, 'The discovery document could not be read.'),
    )

    assert.deepEqual(await saveOidcConfig(CHANGE), {
      state: 'refused',
      message: said,
    })
  }
})

test('a refusal this build has no words for says the status rather than the sentence the API wrote', async () => {
  answering(400, envelope({ refusal: 'overTheLimit' }, 'Too many of them.'))

  assert.deepEqual(await saveOidcConfig(CHANGE), {
    state: 'refused',
    message: 'しばらくしてからもう一度試してください。',
  })
})

test('a refusal with nothing said, or an answer with nothing in it, says the status', async () => {
  for (const [status, body] of [
    [400, envelope(null)],
    [502, undefined],
    [200, envelope(null)],
  ] as const) {
    answering(status, body)

    assert.deepEqual(await saveOidcConfig(CHANGE), {
      state: 'refused',
      message: 'しばらくしてからもう一度試してください。',
    })
  }
})
