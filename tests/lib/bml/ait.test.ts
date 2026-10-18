import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  CONTROL_CODE,
  HTML5_APPLICATION,
  MOST_APPLICATIONS,
  aitApplicationsOf,
  appStartOf,
  applicationToStart,
  hexIdOf,
  receivedAitOf,
  sameStart,
  type AitApplication,
} from '@/lib/bml/ait'

const ENTRY = 'http://hc.example.test/p/index.html'

function application(over: Partial<AitApplication> = {}): AitApplication {
  return {
    orgId: 16,
    appId: 1,
    controlCode: CONTROL_CODE.autostart,
    entryUrl: ENTRY,
    ...over,
  }
}

test('an identifier a document writes is read as hexadecimal without 0x, and anything else is none', () => {
  assert.equal(hexIdOf('10'), 16)
  assert.equal(hexIdOf('1'), 1)
  assert.equal(hexIdOf('Ff'), 255)
  assert.equal(hexIdOf('ffffffff'), 0xffffffff)
  assert.equal(hexIdOf('0x10'), null)
  assert.equal(hexIdOf('10h'), null)
  assert.equal(hexIdOf(''), null)
  assert.equal(hexIdOf('100000000'), null)
  assert.equal(hexIdOf(16), null)
  assert.equal(hexIdOf(undefined), null)
})

test('the application started is the one both identifiers name, and only when it is to start by itself', () => {
  const ait = [
    application({ appId: 2, controlCode: CONTROL_CODE.present }),
    application(),
  ]

  assert.deepEqual(applicationToStart(ait, 16, 1), application())
  assert.equal(applicationToStart(ait, 16, 2), null)
  assert.equal(applicationToStart(ait, 16, 3), null)
  assert.equal(applicationToStart(ait, 18, 1), null)
  assert.equal(
    applicationToStart(
      [application({ controlCode: CONTROL_CODE.present })],
      16,
      1,
    ),
    null,
  )
  assert.equal(applicationToStart([], 16, 1), null)
})

test('a received AIT is the HTML5 type first, then each application with its identifiers in hexadecimal, its control code and its entry', () => {
  const received = receivedAitOf([
    application(),
    application({
      orgId: 0x12,
      appId: 0xab,
      controlCode: CONTROL_CODE.kill,
      entryUrl: 'http://other.example.test/',
    }),
  ])

  assert.equal(HTML5_APPLICATION, 0x0010)
  assert.deepEqual(received, [
    [0x0010],
    ['10', '1', 1, ENTRY],
    ['12', 'ab', 4, 'http://other.example.test/'],
  ])
  assert.deepEqual(receivedAitOf([]), [[0x0010]])
})

test('the applications Carina answered are taken only in the shape it answers them, and a list too long or with one bad is none', () => {
  const answered = {
    applications: [
      {
        orgId: 16,
        appId: 1,
        controlCode: 1,
        entryUrl: ENTRY,
        profile: 1,
        boundary: [{ permissionBitmap: 0x1fff, managedUrls: [] }],
      },
    ],
  }

  assert.deepEqual(aitApplicationsOf(answered), [
    application({
      boundary: [{ permissionBitmap: 0x1fff, managedUrls: [] }],
    }),
  ])
  assert.deepEqual(
    aitApplicationsOf({
      applications: [{ ...answered.applications[0], boundary: undefined }],
    }),
    [application()],
  )
  assert.equal(
    aitApplicationsOf({
      applications: [
        {
          ...answered.applications[0],
          boundary: [{ permissionBitmap: '1fff', managedUrls: [] }],
        },
      ],
    }),
    null,
  )
  assert.deepEqual(aitApplicationsOf({ applications: [] }), [])
  assert.equal(aitApplicationsOf(null), null)
  assert.equal(aitApplicationsOf({}), null)
  assert.equal(
    aitApplicationsOf({
      applications: [{ ...answered.applications[0], orgId: 0 }],
    }),
    null,
  )
  assert.equal(
    aitApplicationsOf({
      applications: [{ ...answered.applications[0], appId: 65536 }],
    }),
    null,
  )
  assert.equal(
    aitApplicationsOf({
      applications: [{ ...answered.applications[0], controlCode: 3 }],
    }),
    null,
  )
  assert.equal(
    aitApplicationsOf({
      applications: [
        { ...answered.applications[0], entryUrl: 'file:///etc/passwd' },
      ],
    }),
    null,
  )
  assert.equal(
    aitApplicationsOf({
      applications: Array.from({ length: MOST_APPLICATIONS + 1 }, () => ({
        ...answered.applications[0],
      })),
    }),
    null,
  )
})

test('a start asked of the player names the AIT by its URL and the application by numbers, and two starts are the same by all three', () => {
  const start = { ait: 'http://hc.example.test/p/a.ait', orgId: 16, appId: 1 }

  assert.deepEqual(appStartOf(start), start)
  assert.equal(appStartOf({ ...start, ait: 'nowhere' }), null)
  assert.equal(appStartOf({ ...start, orgId: 0 }), null)
  assert.equal(appStartOf({ ...start, orgId: 0x1_0000_0000 }), null)
  assert.equal(appStartOf({ ...start, appId: -1 }), null)
  assert.equal(appStartOf({ ...start, appId: 1.5 }), null)
  assert.equal(appStartOf(null), null)
  assert.equal(sameStart(start, { ...start }), true)
  assert.equal(sameStart(start, { ...start, appId: 2 }), false)
  assert.equal(sameStart(start, { ...start, ait: `${start.ait}?x` }), false)
})
