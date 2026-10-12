import {
  MOST_TRANSMIT_BODY,
  RELAY_FAILED,
  answerOf,
  type TransmitAnswer,
} from '@/lib/bml/line'
import { readModule, type BmlModule } from '@/lib/bml/resources'

/** What the relay came to: the answer, the setting refusing the line (403), or the relay not reached or answering in a shape it does not have. */
export type Relayed<Answer> =
  { said: 'answered'; answer: Answer } | { said: 'off' } | { said: 'unreached' }

/** How the player reaches the broadcaster's server for a document: through Carina, never from the document's frame. */
export interface LineRelay {
  transmit(
    uri: string,
    text: string,
    charset: string,
  ): Promise<Relayed<TransmitAnswer>>
  fetch(uri: string): Promise<Relayed<BmlModule>>
}

/** The route a document's text is sent to the broadcaster's server through, for the channel watched live. */
export function liveDataBroadcastTransmitHref(channel: string): string {
  return `/api/live/${encodeURIComponent(channel)}/data-broadcast/transmit`
}

/** The route a document or resource over the line is fetched through, for the channel watched live, answered as a module of the side channel. */
export function liveDataBroadcastFetchHref(
  channel: string,
  uri: string,
): string {
  return `/api/live/${encodeURIComponent(channel)}/data-broadcast/fetch?${new URLSearchParams({ uri }).toString()}`
}

const OFF = 403

function isCode(value: unknown): value is number {
  return Number.isSafeInteger(value)
}

/** What a transmission through the relay came to, from the relay's status and its JSON answer. */
export function transmitRelayed(
  status: number,
  answer: unknown,
): Relayed<TransmitAnswer> {
  if (status === OFF) {
    return { said: 'off' }
  }

  const data = (answer as { data?: unknown } | null)?.data as
    | { result?: unknown; httpStatus?: unknown; body?: unknown }
    | null
    | undefined

  if (
    status !== 200 ||
    !data ||
    !isCode(data.result) ||
    !(data.httpStatus === null || isCode(data.httpStatus)) ||
    !(data.body === null || typeof data.body === 'string')
  ) {
    return { said: 'unreached' }
  }

  return {
    said: 'answered',
    answer: answerOf(
      data.result,
      data.httpStatus ?? Number.NaN,
      (data.body ?? '').slice(0, MOST_TRANSMIT_BODY),
    ),
  }
}

/** What a fetch through the relay came to, from the relay's status and the module it answered. */
export function fetchRelayed(
  status: number,
  bytes: Uint8Array | null,
): Relayed<BmlModule> {
  if (status === OFF) {
    return { said: 'off' }
  }

  const carried = status === 200 && bytes ? readModule(bytes) : null

  return carried ? { said: 'answered', answer: carried } : { said: 'unreached' }
}

/** The answer a document gets when the relay did not answer one: the setting refusing the line or the relay unreached alike. */
export function transmitAnswerOf(
  relayed: Relayed<TransmitAnswer>,
): TransmitAnswer {
  return relayed.said === 'answered' ? relayed.answer : RELAY_FAILED
}
