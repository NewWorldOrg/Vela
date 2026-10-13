import {
  aitApplicationsOf,
  type AitApplication,
  type AppStart,
} from '@/lib/bml/ait'
import {
  MOST_TRANSMIT_BODY,
  RELAY_FAILED,
  answerOf,
  receiverIdOf,
  type ReceiverId,
  type TransmitAnswer,
} from '@/lib/bml/line'
import { readModule, type BmlModule } from '@/lib/bml/resources'

/** What the relay came to: the answer, the setting refusing the line (403), or the relay not reached or answering in a shape it does not have. */
export type Relayed<Answer> =
  { said: 'answered'; answer: Answer } | { said: 'off' } | { said: 'unreached' }

/** A Hybridcast application Carina started: the path on this server its frame opens, through the relay, and the address the application is entered at. */
export interface HybridcastTicket {
  address: string
  entryUrl: string
}

/** How the player reaches the broadcaster's server for a document: through Carina, never from the document's frame. */
export interface LineRelay {
  transmit(
    uri: string,
    text: string,
    charset: string,
  ): Promise<Relayed<TransmitAnswer>>
  fetch(uri: string): Promise<Relayed<BmlModule>>
  receiverId(): Promise<ReceiverId | null>
  ait(uri: string): Promise<Relayed<AitApplication[]>>
  startApplication(start: AppStart): Promise<Relayed<HybridcastTicket>>
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

/** The route Carina names the receiver's identifier on, for the channel watched live: the CA system and the ID of the card its driver last heard from, answered only while the browser's cookies allow the line and hand the identifier over. */
export function liveDataBroadcastReceiverIdHref(channel: string): string {
  return `/api/live/${encodeURIComponent(channel)}/data-broadcast/receiver-id`
}

/** The route an AIT a document names is read through, for the channel watched live, answered as the applications in it this receiver can run. */
export function liveDataBroadcastAitHref(channel: string, uri: string): string {
  return `/api/live/${encodeURIComponent(channel)}/data-broadcast/ait?${new URLSearchParams({ uri }).toString()}`
}

/** The route a Hybridcast application is started on, for the channel watched live: Carina reads the AIT again and issues the ticket its frame opens the relay with. */
export function liveHybridcastTicketHref(channel: string): string {
  return `/api/live/${encodeURIComponent(channel)}/data-broadcast/app/ticket`
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

/** The identifier Carina named, from its status and its JSON answer. Anything but a success in the shape it has names none. */
export function receiverIdRelayed(
  status: number,
  answer: unknown,
): ReceiverId | null {
  return status === 200
    ? receiverIdOf((answer as { data?: unknown } | null)?.data)
    : null
}

function dataOf(answer: unknown): unknown {
  return (answer as { data?: unknown } | null)?.data
}

/** What reading an AIT through the relay came to, from its status and its JSON answer. */
export function aitRelayed(
  status: number,
  answer: unknown,
): Relayed<AitApplication[]> {
  if (status === OFF) {
    return { said: 'off' }
  }

  const applications = status === 200 ? aitApplicationsOf(dataOf(answer)) : null

  return applications
    ? { said: 'answered', answer: applications }
    : { said: 'unreached' }
}

/** A path on this server, and not one that leaves it as `//host` does. */
function isPathHere(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
  )
}

/** What starting an application through Carina came to, from its status and its JSON answer: the address its frame opens, which has to be on this server. */
export function ticketRelayed(
  status: number,
  answer: unknown,
): Relayed<HybridcastTicket> {
  if (status === OFF) {
    return { said: 'off' }
  }

  const data = dataOf(answer) as
    { address?: unknown; entryUrl?: unknown } | null | undefined

  return status === 200 &&
    data &&
    isPathHere(data.address) &&
    typeof data.entryUrl === 'string'
    ? {
        said: 'answered',
        answer: { address: data.address, entryUrl: data.entryUrl },
      }
    : { said: 'unreached' }
}
