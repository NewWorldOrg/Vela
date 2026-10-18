import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  dataBroadcastRead,
  videoDataBroadcastHref,
  videoDataBroadcastModuleHref,
} from '@/repository/video-data-broadcast'

const CATALOG = {
  entryTag: 64,
  autoStart: false,
  startup: '/40/0000/startup.bml',
  incomplete: false,
  carousels: [
    {
      tag: 64,
      downloadId: 1,
      versions: [{ id: 0, version: 1, fromSec: 0, toSec: 600, size: 40 }],
    },
  ],
  events: [],
}

test('the data broadcast is asked for over the source being played, with what the browser decodes', () => {
  assert.equal(
    videoDataBroadcastHref('1266'),
    '/api/videos/1266/data-broadcast',
  )
  assert.equal(
    videoDataBroadcastHref('1266', 'recording'),
    '/api/videos/1266/data-broadcast?source=recording',
  )
  assert.equal(
    videoDataBroadcastHref('1266', 'artefact', ['h265']),
    '/api/videos/1266/data-broadcast?source=artefact&decodes=h265',
  )
})

test('a module version is asked for by its carousel, download, module and version', () => {
  assert.equal(
    videoDataBroadcastModuleHref('1266', {
      tag: 64,
      downloadId: 268435455,
      id: 50,
      version: 7,
    }),
    '/api/videos/1266/data-broadcast/modules/64/268435455/50/7',
  )
})

test('a catalog answered is read, one still being made is coming, and a recording without one has none', () => {
  const read = dataBroadcastRead(200, {
    status: true,
    message: '',
    data: CATALOG,
  })

  assert.equal(read.state, 'read')
  assert.equal(
    read.state === 'read' ? read.timeline.carousels[0].versions.length : 0,
    1,
  )
  assert.deepEqual(dataBroadcastRead(409, undefined), { state: 'coming' })
  assert.deepEqual(dataBroadcastRead(404, undefined), { state: 'none' })
  assert.deepEqual(dataBroadcastRead(500, undefined), { state: 'failed' })
})

test('an answer that is not a catalog is a failure, not a broadcast', () => {
  assert.deepEqual(
    dataBroadcastRead(200, {
      status: true,
      message: '',
      data: { entryTag: 64 },
    }),
    { state: 'failed' },
  )
})
