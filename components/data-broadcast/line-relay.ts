import type { AitApplication, AppStart } from '@/lib/bml/ait'
import {
  aitRelayed,
  fetchRelayed,
  liveDataBroadcastAitHref,
  liveDataBroadcastFetchHref,
  liveDataBroadcastReceiverIdHref,
  liveDataBroadcastTransmitHref,
  liveHybridcastTicketHref,
  receiverIdRelayed,
  startedApplicationOf,
  ticketRelayed,
  transmitRelayed,
  type HybridcastTicket,
  type LineRelay,
  type Relayed,
} from '@/repository/live-data-broadcast'

/** Longer than the relay's own limit on one transmission, so that the relay says it timed out before the player gives up on it. */
export const RELAY_GIVEN_UP_AFTER_MS = 20_000

/** The path on this server of the script a Hybridcast application's documents are given, which offers them the receiver's functions. Carina puts it into every document it relays for the application. */
export const HYBRIDCAST_RECEIVER_SCRIPT =
  '/data-broadcast/hybridcast-receiver.js'

type Send = (input: string, init: RequestInit) => Promise<Response>

/** The relay of the channel watched live. A relay that cannot be reached, or answers in a shape it does not have, is unreached. An application is started with Carina's ticket and the AIT read again beside it, for the boundary its permissions come from. */
export function liveLineRelay(
  channel: string,
  send: Send = (input, init) => fetch(input, init),
): LineRelay {
  const asking = (): RequestInit => ({
    cache: 'no-store',
    credentials: 'same-origin',
    signal: AbortSignal.timeout(RELAY_GIVEN_UP_AFTER_MS),
  })

  const ait = async (uri: string): Promise<Relayed<AitApplication[]>> => {
    try {
      const answer = await send(liveDataBroadcastAitHref(channel, uri), {
        ...asking(),
        headers: { accept: 'application/json' },
      })

      return aitRelayed(
        answer.status,
        answer.ok ? await answer.json() : undefined,
      )
    } catch {
      return { said: 'unreached' }
    }
  }

  const ticket = async (
    start: AppStart,
  ): Promise<Relayed<HybridcastTicket>> => {
    try {
      const answer = await send(liveHybridcastTicketHref(channel), {
        ...asking(),
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ait: start.ait,
          orgId: start.orgId,
          appId: start.appId,
          receiverScript: HYBRIDCAST_RECEIVER_SCRIPT,
        }),
      })

      return ticketRelayed(
        answer.status,
        answer.ok ? await answer.json() : undefined,
      )
    } catch {
      return { said: 'unreached' }
    }
  }

  return {
    transmit: async (uri, text, charset) => {
      try {
        const answer = await send(liveDataBroadcastTransmitHref(channel), {
          ...asking(),
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ uri, text, charset }),
        })

        return transmitRelayed(
          answer.status,
          answer.ok ? await answer.json() : undefined,
        )
      } catch {
        return { said: 'unreached' }
      }
    },
    fetch: async (uri) => {
      try {
        const answer = await send(
          liveDataBroadcastFetchHref(channel, uri),
          asking(),
        )

        return fetchRelayed(
          answer.status,
          answer.ok ? new Uint8Array(await answer.arrayBuffer()) : null,
        )
      } catch {
        return { said: 'unreached' }
      }
    },
    receiverId: async () => {
      try {
        const answer = await send(liveDataBroadcastReceiverIdHref(channel), {
          ...asking(),
          headers: { accept: 'application/json' },
        })

        return receiverIdRelayed(
          answer.status,
          answer.ok ? await answer.json() : undefined,
        )
      } catch {
        return null
      }
    },
    ait,
    startApplication: async (start) => {
      const [started, read] = await Promise.all([ticket(start), ait(start.ait)])

      return startedApplicationOf(start, started, read)
    },
  }
}
