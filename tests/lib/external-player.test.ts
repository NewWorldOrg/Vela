import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  airPlayCanBeHanded,
  appHref,
  liveHandover,
  playerAppsOn,
  recordingHandover,
  recordingHandoverChoices,
  takeTheTicket,
  ticketedHref,
} from '@/lib/external-player'
import { NO_TICKET, type TicketWrite } from '@/repository/tickets'

const WATCHING = 'https://vela.example/live?ch=32736-1024'

const TICKET = 'Kk3Zq7Xm-a-ticket-that-lapses-in-thirty-secs'

const NOT_IN_THE_LINEUP =
  'このチャンネルは一覧に無いため、外部プレイヤーの札を発行できませんでした。'

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

const DETAIL = 'https://vela.example/recordings/a-recording'

const RECORDED_BYTES = 16_857_325_158

function hrefsOf(
  choices: ReturnType<typeof recordingHandoverChoices>,
): string[] {
  return choices.map((one) => ticketedHref(one.handover, DETAIL, TICKET))
}

test('a recording asked for as it was recorded names that file in the URL', () => {
  assert.equal(
    ticketedHref(
      recordingHandover('a-recording', async () => issued(), 'recording'),
      DETAIL,
      TICKET,
    ),
    `https://ticket:${TICKET}@vela.example/api/videos/a-recording?source=recording`,
  )
})

test('an encoded recording offers the artefact first and the recording with its size', () => {
  const choices = recordingHandoverChoices(
    'a-recording',
    async () => issued(),
    { source: 'artefact', alternative: 'recording' },
    RECORDED_BYTES,
  )

  assert.deepEqual(
    choices.map(({ source, label, size }) => ({ source, label, size })),
    [
      { source: 'artefact', label: 'エンコード済み', size: undefined },
      { source: 'recording', label: '元のまま', size: '15.7 GB' },
    ],
  )
  assert.deepEqual(hrefsOf(choices), [
    `https://ticket:${TICKET}@vela.example/api/videos/a-recording?source=artefact`,
    `https://ticket:${TICKET}@vela.example/api/videos/a-recording?source=recording`,
  ])
})

test('the order stays the same while the recording itself is the one playing', () => {
  const choices = recordingHandoverChoices(
    'a-recording',
    async () => issued(),
    { source: 'recording', alternative: 'artefact' },
    RECORDED_BYTES,
  )

  assert.deepEqual(
    choices.map((one) => one.source),
    ['artefact', 'recording'],
  )
})

test('a recording with no artefact offers the recording alone', () => {
  const choices = recordingHandoverChoices(
    'a-recording',
    async () => issued(),
    { source: 'recording' },
    RECORDED_BYTES,
  )

  assert.deepEqual(
    choices.map(({ label, size }) => [label, size]),
    [['元のまま', '15.7 GB']],
  )
})

test('an artefact whose recording is gone offers the artefact alone', () => {
  const choices = recordingHandoverChoices(
    'a-recording',
    async () => issued(),
    { source: 'artefact' },
    RECORDED_BYTES,
  )

  assert.deepEqual(
    choices.map((one) => one.source),
    ['artefact'],
  )
})

test('the recording is offered without a size when its size is not known', () => {
  const choices = recordingHandoverChoices(
    'a-recording',
    async () => issued(),
    { source: 'recording' },
    undefined,
  )

  assert.equal(choices[0].size, undefined)
})

test('a plan that names neither file offers nothing to choose', () => {
  assert.deepEqual(
    recordingHandoverChoices('a-recording', async () => issued(), {}, 1),
    [],
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

test('a port the scheme does not imply follows the channel to the player', () => {
  assert.equal(
    ticketedHref(
      liveHandover(32736, 1024, issued),
      'https://vela.example:8443/live?ch=32736-1024',
      TICKET,
    ),
    `https://:${TICKET}@vela.example:8443/api/live/32736-1024/stream`,
  )
})

test('a refusal is carried back as it was said, and no URL is built', async () => {
  const built: string[] = []
  const handover = liveHandover(32736, 1024, async () => ({
    state: 'refused',
    message: NOT_IN_THE_LINEUP,
  }))

  const write = await handover.take()

  if (write.state === 'ok') {
    built.push(ticketedHref(handover, WATCHING, write.ticket.inTheClear))
  }

  assert.equal(write.state === 'refused' && write.message, NOT_IN_THE_LINEUP)
  assert.deepEqual(built, [])
})

test('a session that has lapsed carries no saying, and builds no URL either', async () => {
  const built: string[] = []
  const handover = liveHandover(32736, 1024, async () => ({
    state: 'unauthenticated',
  }))

  const write = await handover.take()

  if (write.state === 'ok') {
    built.push(ticketedHref(handover, WATCHING, write.ticket.inTheClear))
  }

  assert.deepEqual(write, { state: 'unauthenticated' })
  assert.deepEqual(built, [])
})

test('AirPlay is handed a recording whose plan names the artefact, whichever one is playing', () => {
  assert.equal(
    airPlayCanBeHanded({ source: 'artefact', alternative: 'recording' }),
    true,
  )
  assert.equal(
    airPlayCanBeHanded({ source: 'recording', alternative: 'artefact' }),
    true,
  )
  assert.equal(airPlayCanBeHanded({ source: 'artefact' }), true)
})

test('AirPlay is not handed a recording with no artefact to give it', () => {
  assert.equal(airPlayCanBeHanded({ source: 'recording' }), false)
  assert.equal(airPlayCanBeHanded({}), false)
})

const TICKETED = `https://ticket:${TICKET}@vela.example/api/videos/a-recording?source=recording`

test('VLC is handed the whole URL, escaped, the way its x-callback takes a stream', () => {
  assert.equal(
    appHref('vlc', TICKETED),
    `vlc-x-callback://x-callback-url/stream?url=https%3A%2F%2Fticket%3A${TICKET}%40vela.example%2Fapi%2Fvideos%2Fa-recording%3Fsource%3Drecording`,
  )
})

test('Infuse is handed the whole URL, escaped, the way its x-callback plays one', () => {
  assert.equal(
    appHref('infuse', TICKETED),
    `infuse://x-callback-url/play?url=https%3A%2F%2Fticket%3A${TICKET}%40vela.example%2Fapi%2Fvideos%2Fa-recording%3Fsource%3Drecording`,
  )
})

test('what an app is handed reads back as the URL that was given', () => {
  for (const app of ['vlc', 'infuse'] as const) {
    assert.equal(
      new URL(appHref(app, TICKETED)).searchParams.get('url'),
      TICKETED,
    )
  }
})

const AN_IPHONE = {
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  maxTouchPoints: 5,
}

const AN_IPAD_THAT_SAYS_SO = {
  userAgent:
    'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1',
  maxTouchPoints: 5,
}

const AN_IPAD_THAT_SAYS_MAC = {
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  maxTouchPoints: 5,
}

const A_MAC = { ...AN_IPAD_THAT_SAYS_MAC, maxTouchPoints: 0 }

const A_WINDOWS_DESKTOP = {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  maxTouchPoints: 0,
}

const A_WINDOWS_TABLET = { ...A_WINDOWS_DESKTOP, maxTouchPoints: 10 }

const A_LINUX_DESKTOP = {
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  maxTouchPoints: 0,
}

const AN_ANDROID_PHONE = {
  userAgent:
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  maxTouchPoints: 5,
}

test('an iPhone and an iPad are offered VLC and Infuse', () => {
  for (const device of [AN_IPHONE, AN_IPAD_THAT_SAYS_SO]) {
    assert.deepEqual(playerAppsOn(device), ['vlc', 'infuse'])
  }
})

test('an iPad that names itself a Mac is told apart by its touch', () => {
  assert.deepEqual(playerAppsOn(AN_IPAD_THAT_SAYS_MAC), ['vlc', 'infuse'])
})

test('a Mac is offered Infuse alone', () => {
  assert.deepEqual(playerAppsOn(A_MAC), ['infuse'])
})

test('a device with no app to open one in is offered none', () => {
  for (const device of [
    A_WINDOWS_DESKTOP,
    A_WINDOWS_TABLET,
    A_LINUX_DESKTOP,
    AN_ANDROID_PHONE,
  ]) {
    assert.deepEqual(playerAppsOn(device), [])
  }
})

test('a ticket that is issued becomes the URL the player is handed', async () => {
  assert.deepEqual(
    await takeTheTicket(recordingHandover('a-recording', issued), DETAIL),
    { href: `https://ticket:${TICKET}@vela.example/api/videos/a-recording` },
  )
})

test('a ticket refused says why, in the words it was refused with', async () => {
  const refused = async (): Promise<TicketWrite> => ({
    state: 'refused',
    message: NOT_IN_THE_LINEUP,
  })

  assert.deepEqual(await takeTheTicket(liveHandover(4, 5, refused), WATCHING), {
    refused: NOT_IN_THE_LINEUP,
  })
})

test('a ticket asked for after the session lapsed says so', async () => {
  const lapsed = async (): Promise<TicketWrite> => ({
    state: 'unauthenticated',
  })

  assert.deepEqual(
    await takeTheTicket(recordingHandover('a-recording', lapsed), DETAIL),
    {
      refused:
        'サインインが切れているため、外部プレイヤーの札を発行できませんでした。',
    },
  )
})

test('a ticket that never came back is refused in the words a refusal uses', async () => {
  const unreached = async (): Promise<TicketWrite> => {
    throw new TypeError('Failed to fetch')
  }

  for (const handover of [
    recordingHandover('a-recording', unreached),
    liveHandover(4, 5, unreached),
  ]) {
    assert.deepEqual(
      await takeTheTicket(handover, DETAIL),
      { refused: NO_TICKET },
      'The request for a ticket failed on the way and nothing was said. ' +
        'Say it where a refusal is said.',
    )
  }
})
