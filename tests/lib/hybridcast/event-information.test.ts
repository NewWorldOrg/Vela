import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  eventInformationAnswer,
  eventInformationOf,
  eventInformationOfValue,
  sameEventOnAir,
} from '@/lib/hybridcast/event-information'

const CHANNEL = {
  networkId: 32736,
  serviceId: 1024,
  now: {
    eventId: 0x1234,
    title: 'ニュース',
    description: '今日の出来事',
    startsAt: '2026-10-14T12:00:00Z',
    endsAt: '2026-10-14T12:30:00Z',
  },
  next: {
    eventId: 0x1235,
    title: '天気',
    startsAt: '2026-10-14T12:30:00Z',
  },
}

test('an application is told the service, the event on air and the next one, with starts as dates and lengths in seconds', () => {
  const answer = eventInformationAnswer(eventInformationOf(CHANNEL))

  assert.equal(answer.original_network_id, 32736)
  assert.equal(answer.transport_stream_id, null)
  assert.equal(answer.service_id, 1024)
  assert.equal(answer.event_id, 0x1234)
  assert.ok(answer.start_time instanceof Date)
  assert.equal(
    (answer.start_time as Date).toISOString(),
    '2026-10-14T12:00:00.000Z',
  )
  assert.equal(answer.duration, 1800)
  assert.equal(answer.name, 'ニュース')
  assert.equal(answer.desc, '今日の出来事')
  assert.equal(answer.f_event_id, 0x1235)
  assert.equal(
    (answer.f_start_time as Date).toISOString(),
    '2026-10-14T12:30:00.000Z',
  )
  assert.equal(answer.f_duration, null)
  assert.equal(answer.f_name, '天気')
  assert.equal(answer.f_desc, '')
})

test('a service with nothing on air in the guide is told with empty programmes', () => {
  const answer = eventInformationAnswer(
    eventInformationOf({ networkId: 1, serviceId: 2 }),
  )

  assert.equal(answer.event_id, null)
  assert.equal(answer.start_time, null)
  assert.equal(answer.name, '')
})

test('information handed over is read back in its shape, and refused in another', () => {
  const information = eventInformationOf(CHANNEL)

  assert.deepEqual(
    eventInformationOfValue(JSON.parse(JSON.stringify(information))),
    information,
  )
  assert.equal(eventInformationOfValue({ ...information, serviceId: -1 }), null)
  assert.equal(
    eventInformationOfValue({ ...information, now: { name: 1 } }),
    null,
  )
  assert.equal(eventInformationOfValue(null), null)
})

test('a programme that changed is told apart from the guide answering the same one again', () => {
  const information = eventInformationOf(CHANNEL)
  const following = eventInformationOf({ ...CHANNEL, now: CHANNEL.next })

  assert.equal(sameEventOnAir(information, eventInformationOf(CHANNEL)), true)
  assert.equal(sameEventOnAir(information, following), false)
  assert.equal(sameEventOnAir(null, null), true)
})
