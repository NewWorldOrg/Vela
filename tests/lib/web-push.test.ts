import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'

import type { NotificationWrite } from '@/lib/notifications'
import {
  DENIED_HERE,
  NOT_ALLOWED_HERE,
  REASON_OF,
  addThisBrowser,
  base64UrlOf,
  bytesOfBase64Url,
  fingerprintOf,
  hereOf,
  ownRowOf,
  readinessOf,
  renewThisBrowser,
  renewalFor,
  type BrowserRow,
  type PushCarina,
  type PushHands,
  type PushMemory,
  type PushSubscriptionDraft,
  type PushSurroundings,
} from '@/lib/web-push'

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/sample-token-one'

const OTHER_ENDPOINT = 'https://fcm.googleapis.com/fcm/send/sample-token-two'

const KEY = 'BPsampleServerKey'

const OTHER_KEY = 'BPanotherServerKey'

const KEYS = { p256dh: 'BSampleP256dh', auth: 'sampleAuth' }

const sha256 = (text: string) =>
  createHash('sha256').update(text, 'utf8').digest('hex')

const READY: PushSurroundings = {
  serviceWorker: true,
  pushManager: true,
  notification: true,
  permission: 'default',
  appleTouch: false,
  standalone: false,
  publicOriginKnown: true,
}

test('the fingerprint is the lowercase hex SHA-256 of the address as the browser gave it', async () => {
  assert.equal(await fingerprintOf(ENDPOINT), sha256(ENDPOINT))
  assert.equal(
    await fingerprintOf('https://web.push.apple.com/QOk-日本'),
    sha256('https://web.push.apple.com/QOk-日本'),
  )
})

test('the row of this browser is the browser row whose fingerprint is that of its subscription', () => {
  const rows = [
    { id: 'slack', kind: 'slack' as const },
    { id: 'pc', kind: 'webPush' as const, fingerprint: sha256(OTHER_ENDPOINT) },
    { id: 'here', kind: 'webPush' as const, fingerprint: sha256(ENDPOINT) },
  ]

  assert.equal(ownRowOf(rows, sha256(ENDPOINT)), 'here')
  assert.equal(ownRowOf(rows, sha256(ENDPOINT).toUpperCase()), 'here')
  assert.equal(ownRowOf(rows, sha256('elsewhere')), undefined)
  assert.equal(ownRowOf(rows, undefined), undefined)
})

test('a row that is not a browser is never this browser, whatever it carries', () => {
  assert.equal(
    ownRowOf(
      [{ id: 'slack', kind: 'slack', fingerprint: sha256(ENDPOINT) }],
      sha256(ENDPOINT),
    ),
    undefined,
  )
})

test('a browser that has everything and has not refused can be added', () => {
  assert.equal(readinessOf(READY), 'ready')
  assert.equal(readinessOf({ ...READY, permission: 'granted' }), 'ready')
})

test('an iPhone or iPad outside the home screen is told where it works, before anything else', () => {
  assert.equal(
    readinessOf({ ...READY, appleTouch: true, pushManager: false }),
    'homeScreenOnly',
  )
  assert.equal(
    readinessOf({ ...READY, appleTouch: true, standalone: true }),
    'ready',
  )
})

test('a browser without a worker, a push manager or notices cannot be added', () => {
  assert.equal(readinessOf({ ...READY, serviceWorker: false }), 'unsupported')
  assert.equal(readinessOf({ ...READY, pushManager: false }), 'unsupported')
  assert.equal(readinessOf({ ...READY, notification: false }), 'unsupported')
  assert.equal(
    readinessOf({
      ...READY,
      appleTouch: true,
      standalone: true,
      pushManager: false,
    }),
    'unsupported',
  )
})

test('a browser that refused notices says so, and the missing public address after it', () => {
  assert.equal(readinessOf({ ...READY, permission: 'denied' }), 'denied')
  assert.equal(
    readinessOf({ ...READY, permission: 'denied', publicOriginKnown: false }),
    'denied',
  )
  assert.equal(
    readinessOf({ ...READY, publicOriginKnown: false }),
    'noPublicOrigin',
  )
})

test('every reason is one sentence, and the refusal keeps the words the screen already had', () => {
  assert.equal(REASON_OF.ready, undefined)
  assert.equal(
    REASON_OF.denied,
    'このブラウザは通知を拒否しています。サイトの設定で許可してください',
  )
  assert.equal(REASON_OF.denied, DENIED_HERE)

  for (const reason of [
    REASON_OF.unsupported,
    REASON_OF.homeScreenOnly,
    REASON_OF.noPublicOrigin,
  ]) {
    assert.ok(reason && !reason.includes('。'), String(reason))
  }
})

test('the name an iPad gives is that of an iPad, though its Safari says Mac', () => {
  const desktopSafari =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15'

  assert.equal(hereOf(desktopSafari, 5), 'iPad の Safari')
  assert.equal(hereOf(desktopSafari, 0), 'Mac の Safari')
  assert.equal(
    hereOf(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
      10,
    ),
    'Windows の Chrome',
  )
})

test('a key goes between text and bytes in base64url without padding', () => {
  const bytes = new Uint8Array([0, 1, 250, 251, 252, 253, 254, 255])

  assert.equal(base64UrlOf(bytes), 'AAH6-_z9_v8')
  assert.deepEqual(bytesOfBase64Url('AAH6-_z9_v8'), bytes)
  assert.deepEqual(bytesOfBase64Url('AAH6-_z9_v8='), bytes)
})

interface Record {
  done: string[]
  remembered?: string
  forgotten: boolean
}

function hands(
  record: Record,
  more: Partial<PushHands> & {
    existing?: { endpoint: string; serverKey?: string }
  } = {},
): PushHands {
  let current = more.existing
    ? {
        endpoint: more.existing.endpoint,
        keys: KEYS,
        serverKey: more.existing.serverKey,
      }
    : undefined

  return {
    permission: () => 'granted',
    askPermission: async () => {
      record.done.push('ask')

      return 'granted'
    },
    register: async () => {
      record.done.push('register')
    },
    current: async () => {
      record.done.push('current')

      return current
    },
    subscribe: async (key) => {
      record.done.push(`subscribe ${key}`)
      current = { endpoint: ENDPOINT, keys: KEYS, serverKey: key }

      return current
    },
    unsubscribe: async () => {
      record.done.push('unsubscribe')
      current = undefined
    },
    ...more,
  }
}

function carina(record: Record, more: Partial<PushCarina> = {}): PushCarina {
  return {
    readKey: async () => {
      record.done.push('key')

      return { state: 'ok', publicKey: KEY }
    },
    add: async (draft: PushSubscriptionDraft & { name: string }) => {
      record.done.push(`add ${draft.name} ${draft.endpoint}`)

      return { state: 'ok', id: 'made' }
    },
    rows: async () => {
      record.done.push('rows')

      return []
    },
    replace: async (id, draft) => {
      record.done.push(`replace ${id} ${draft.endpoint}`)

      return { state: 'ok', id }
    },
    ...more,
  }
}

function memory(record: Record, kept?: string): PushMemory {
  record.remembered = kept

  return {
    recall: () => record.remembered,
    remember: (id) => {
      record.remembered = id
    },
    forget: () => {
      record.forgotten = true
      record.remembered = undefined
    },
  }
}

const fresh = (): Record => ({ done: [], forgotten: false })

test('adding asks first, then registers, reads the key, subscribes, sends it and remembers the row', async () => {
  const record = fresh()

  const result = await addThisBrowser(
    'Windows の Chrome',
    hands(record),
    carina(record),
    memory(record),
  )

  assert.deepEqual(result, { state: 'ok' })
  assert.deepEqual(record.done, [
    'ask',
    'key',
    'register',
    'current',
    `subscribe ${KEY}`,
    `add Windows の Chrome ${ENDPOINT}`,
  ])
  assert.equal(record.remembered, 'made')
})

test('a subscription made with the same key is sent as it is', async () => {
  const record = fresh()

  await addThisBrowser(
    'Windows の Chrome',
    hands(record, { existing: { endpoint: OTHER_ENDPOINT, serverKey: KEY } }),
    carina(record),
    memory(record),
  )

  assert.deepEqual(record.done.slice(3), [
    'current',
    `add Windows の Chrome ${OTHER_ENDPOINT}`,
  ])
})

test('a subscription made with another key is given up before a new one is made', async () => {
  const record = fresh()

  await addThisBrowser(
    'Windows の Chrome',
    hands(record, {
      existing: { endpoint: OTHER_ENDPOINT, serverKey: OTHER_KEY },
    }),
    carina(record),
    memory(record),
  )

  assert.deepEqual(record.done.slice(3), [
    'current',
    'unsubscribe',
    `subscribe ${KEY}`,
    `add Windows の Chrome ${ENDPOINT}`,
  ])
})

test('a refused prompt adds nothing and says that notices are refused here', async () => {
  const record = fresh()

  const result = await addThisBrowser(
    'Windows の Chrome',
    hands(record, { askPermission: async () => 'denied' }),
    carina(record),
    memory(record),
  )

  assert.deepEqual(result, { state: 'rejected', message: DENIED_HERE })
  assert.deepEqual(record.done, [])
})

test('a prompt closed without an answer adds nothing and says so', async () => {
  const record = fresh()

  const result = await addThisBrowser(
    'Windows の Chrome',
    hands(record, { askPermission: async () => 'default' }),
    carina(record),
    memory(record),
  )

  assert.deepEqual(result, { state: 'rejected', message: NOT_ALLOWED_HERE })
  assert.deepEqual(record.done, [])
})

test('a key Carina will not give stops the adding before anything is subscribed', async () => {
  const record = fresh()
  const refused: NotificationWrite = {
    state: 'rejected',
    message: REASON_OF.noPublicOrigin as string,
  }

  const result = await addThisBrowser(
    'Windows の Chrome',
    hands(record),
    carina(record, { readKey: async () => refused }),
    memory(record),
  )

  assert.deepEqual(result, refused)
  assert.deepEqual(record.done, ['ask'])
  assert.equal(record.remembered, undefined)
})

test('a subscription Carina refuses is given up again, so none is left without a row', async () => {
  const record = fresh()
  const refused: NotificationWrite = { state: 'rejected', message: 'no' }

  const result = await addThisBrowser(
    'Windows の Chrome',
    hands(record),
    carina(record, { add: async () => refused }),
    memory(record),
  )

  assert.deepEqual(result, refused)
  assert.equal(record.done.at(-1), 'unsubscribe')
  assert.equal(record.remembered, undefined)
})

test('a signed-out answer is given up the same way and passed on as it is', async () => {
  const record = fresh()

  const result = await addThisBrowser(
    'Windows の Chrome',
    hands(record),
    carina(record, { add: async () => ({ state: 'unauthenticated' }) }),
    memory(record),
  )

  assert.deepEqual(result, { state: 'unauthenticated' })
  assert.equal(record.done.at(-1), 'unsubscribe')
})

test('a subscription that was there before is not given up when Carina refuses it', async () => {
  const record = fresh()

  await addThisBrowser(
    'Windows の Chrome',
    hands(record, { existing: { endpoint: OTHER_ENDPOINT, serverKey: KEY } }),
    carina(record, {
      add: async () => ({ state: 'rejected', message: 'no' }),
    }),
    memory(record),
  )

  assert.ok(!record.done.includes('unsubscribe'))
})

test('a subscription the browser cannot make is refused as what could not be done', async () => {
  const record = fresh()

  const result = await addThisBrowser(
    'Windows の Chrome',
    hands(record, {
      subscribe: async () => {
        throw new Error('push service unavailable')
      },
    }),
    carina(record),
    memory(record),
  )

  assert.deepEqual(result, {
    state: 'rejected',
    message:
      '送り先を追加できませんでした。時間をおいてからもう一度お試しください。',
  })
  assert.ok(!record.done.some((one) => one.startsWith('add')))
})

test('a sending that never reached Vela is refused the same way, and the subscription is given up', async () => {
  const record = fresh()

  const result = await addThisBrowser(
    'Windows の Chrome',
    hands(record),
    carina(record, {
      add: async () => {
        throw new Error('offline')
      },
    }),
    memory(record),
  )

  assert.equal(result.state, 'rejected')
  assert.equal(record.done.at(-1), 'unsubscribe')
})

const ROW: BrowserRow = { id: 'kept', fingerprint: sha256(ENDPOINT) }

test('the renewal leaves alone a browser whose row has its subscription', () => {
  assert.deepEqual(
    renewalFor({ remembered: 'kept', rows: [ROW], current: sha256(ENDPOINT) }),
    { do: 'nothing' },
  )
})

test('the renewal sends a subscription the browser made anew to the row remembered', () => {
  assert.deepEqual(
    renewalFor({
      remembered: 'kept',
      rows: [ROW],
      current: sha256(OTHER_ENDPOINT),
    }),
    { do: 'replace' },
  )
})

test('the renewal subscribes again where the browser lost its subscription', () => {
  assert.deepEqual(
    renewalFor({ remembered: 'kept', rows: [ROW], current: undefined }),
    { do: 'subscribeAgain' },
  )
})

test('the renewal forgets a row that is gone', () => {
  assert.deepEqual(
    renewalFor({
      remembered: 'kept',
      rows: [{ id: 'other', fingerprint: sha256(OTHER_ENDPOINT) }],
      current: sha256(ENDPOINT),
    }),
    { do: 'forget' },
  )
  assert.deepEqual(
    renewalFor({ remembered: 'kept', rows: [], current: undefined }),
    { do: 'forget' },
  )
})

test('the renewal takes the row that already has this subscription as this browser', () => {
  assert.deepEqual(
    renewalFor({
      remembered: 'kept',
      rows: [ROW, { id: 'other', fingerprint: sha256(OTHER_ENDPOINT) }],
      current: sha256(OTHER_ENDPOINT),
    }),
    { do: 'adopt', id: 'other' },
  )
})

test('the renewal does nothing while the rows cannot be read', () => {
  assert.deepEqual(
    renewalFor({ remembered: 'kept', rows: undefined, current: undefined }),
    { do: 'nothing' },
  )
})

test('the renewal reads nothing without a grant or a row remembered', async () => {
  const record = fresh()

  await renewThisBrowser(
    hands(record, { permission: () => 'default' }),
    carina(record),
    memory(record, 'kept'),
  )
  await renewThisBrowser(hands(record), carina(record), memory(record))

  assert.deepEqual(record.done, [])
})

test('the renewal puts a new subscription to the row remembered', async () => {
  const record = fresh()

  await renewThisBrowser(
    hands(record, { existing: { endpoint: OTHER_ENDPOINT, serverKey: KEY } }),
    carina(record, { rows: async () => [ROW] }),
    memory(record, 'kept'),
  )

  assert.deepEqual(record.done, ['current', `replace kept ${OTHER_ENDPOINT}`])
  assert.equal(record.remembered, 'kept')
})

test('the renewal subscribes again without asking and puts it to the row', async () => {
  const record = fresh()

  await renewThisBrowser(
    hands(record, {
      askPermission: async () => {
        throw new Error('never asked')
      },
    }),
    carina(record, { rows: async () => [ROW] }),
    memory(record, 'kept'),
  )

  assert.deepEqual(record.done, [
    'current',
    'key',
    'register',
    `subscribe ${KEY}`,
    `replace kept ${ENDPOINT}`,
  ])
})

test('the renewal forgets the row and gives up the subscription when the row is gone', async () => {
  const record = fresh()

  await renewThisBrowser(
    hands(record, { existing: { endpoint: ENDPOINT, serverKey: KEY } }),
    carina(record, { rows: async () => [] }),
    memory(record, 'kept'),
  )

  assert.equal(record.forgotten, true)
  assert.equal(record.done.at(-1), 'unsubscribe')
})

test('the renewal forgets the row when Carina says it is gone while it is put', async () => {
  const record = fresh()

  await renewThisBrowser(
    hands(record, { existing: { endpoint: OTHER_ENDPOINT, serverKey: KEY } }),
    carina(record, {
      rows: async () => [ROW],
      replace: async () => ({ state: 'rejected', message: 'gone', gone: true }),
    }),
    memory(record, 'kept'),
  )

  assert.equal(record.forgotten, true)
  assert.equal(record.done.at(-1), 'unsubscribe')
})

test('the renewal keeps the row for another day when the putting is refused otherwise', async () => {
  const record = fresh()

  await renewThisBrowser(
    hands(record, { existing: { endpoint: OTHER_ENDPOINT, serverKey: KEY } }),
    carina(record, {
      rows: async () => [ROW],
      replace: async () => ({ state: 'rejected', message: 'taken' }),
    }),
    memory(record, 'kept'),
  )

  assert.equal(record.forgotten, false)
  assert.equal(record.remembered, 'kept')
})

test('the renewal remembers the row that already has this subscription', async () => {
  const record = fresh()

  await renewThisBrowser(
    hands(record, { existing: { endpoint: OTHER_ENDPOINT, serverKey: KEY } }),
    carina(record, {
      rows: async () => [
        ROW,
        { id: 'other', fingerprint: sha256(OTHER_ENDPOINT) },
      ],
    }),
    memory(record, 'kept'),
  )

  assert.equal(record.remembered, 'other')
  assert.ok(!record.done.some((one) => one.startsWith('replace')))
})

test('the renewal never throws, whatever fails', async () => {
  const record = fresh()

  await renewThisBrowser(
    hands(record),
    carina(record, {
      rows: async () => {
        throw new Error('offline')
      },
    }),
    memory(record, 'kept'),
  )
  await renewThisBrowser(
    hands(record, {
      current: async () => {
        throw new Error('no worker')
      },
    }),
    carina(record, { rows: async () => [ROW] }),
    memory(record, 'kept'),
  )

  assert.equal(record.remembered, 'kept')
})
