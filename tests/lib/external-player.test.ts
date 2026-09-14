import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  liveHandover,
  recordingHandover,
  ticketedHref,
} from '@/lib/external-player'
import type { TicketWrite } from '@/repository/videos'

const WATCHING = 'https://vela.example/live?ch=32736-1024'

const TICKET = 'Kk3Zq7Xm-a-ticket-that-lapses-in-thirty-secs'

async function issued(): Promise<TicketWrite> {
  return {
    state: 'ok',
    ticket: { inTheClear: TICKET, lapsesAt: '2026-08-11T00:00:30Z' },
  }
}

test('a live channel is handed over as the URL an external player accepts', () => {
  const handover = liveHandover(32736, 1024, issued)

  assert.equal(
    ticketedHref(handover, WATCHING, TICKET),
    `https://:${TICKET}@vela.example/api/live/32736-1024/stream`,
  )
})

test('the live ticket rides as the password half, with no user beside it', () => {
  const url = new URL(
    ticketedHref(liveHandover(32736, 1024, issued), WATCHING, TICKET),
  )

  assert.equal(url.username, '')
  assert.equal(url.password, TICKET)
  assert.equal(url.pathname, '/api/live/32736-1024/stream')
  assert.equal(url.search, '')
})

test('what the page was watching does not follow the channel to the player', () => {
  assert.equal(
    ticketedHref(
      liveHandover(4, 5, issued),
      'https://vela.example/live?ch=4-5',
      TICKET,
    ),
    `https://:${TICKET}@vela.example/api/live/4-5/stream`,
  )
})

test('a recording is handed over the way it always was', () => {
  assert.equal(
    ticketedHref(
      recordingHandover('a-recording', async () => issued()),
      'https://vela.example/recordings/a-recording',
      TICKET,
    ),
    `https://ticket:${TICKET}@vela.example/api/videos/a-recording`,
  )
})

test('the channel being watched is what the ticket is asked for', async () => {
  const asked: [number, number][] = []
  const handover = liveHandover(32737, 1032, async (networkId, serviceId) => {
    asked.push([networkId, serviceId])

    return issued()
  })

  const write = await handover.take()

  assert.deepEqual(asked, [[32737, 1032]])
  assert.equal(write.state === 'ok' && write.ticket.inTheClear, TICKET)
})

test('a refusal is carried back as it was said, and no URL is built', async () => {
  const handover = liveHandover(32736, 1024, async () => ({
    state: 'refused',
    message:
      'このチャンネルは選局できないため、外部プレイヤーの札を発行できませんでした。',
  }))

  const write = await handover.take()

  assert.equal(write.state, 'refused')
})
