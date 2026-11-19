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
import type { OwnedApplication } from '@/lib/hybridcast/messages'

export type Relayed<Answer> =
  { said: 'answered'; answer: Answer } | { said: 'off' } | { said: 'unreached' }

export interface HybridcastTicket {
  address: string
  entryUrl: string
}

export interface LineRelay {
  transmit(
    uri: string,
    text: string,
    charset: string,
  ): Promise<Relayed<TransmitAnswer>>
  fetch(uri: string): Promise<Relayed<BmlModule>>
  receiverId(): Promise<ReceiverId | null>
  ait(uri: string): Promise<Relayed<AitApplication[]>>
  startApplication(start: AppStart): Promise<Relayed<StartedApplication>>
}

export interface StartedApplication {
  address: string
  application: OwnedApplication
}

export function startedApplicationOf(
  start: AppStart,
  ticket: Relayed<HybridcastTicket>,
  read: Relayed<AitApplication[]>,
): Relayed<StartedApplication> {
  if (ticket.said !== 'answered') {
    return ticket
  }

  const named =
    read.said === 'answered'
      ? read.answer.find(
          (one) => one.orgId === start.orgId && one.appId === start.appId,
        )
      : undefined

  if (!named?.boundary) {
    return { said: 'unreached' }
  }

  return {
    said: 'answered',
    answer: {
      address: ticket.answer.address,
      application: {
        ait: start.ait,
        orgId: named.orgId,
        appId: named.appId,
        controlCode: named.controlCode,
        entryUrl: named.entryUrl,
        boundary: named.boundary,
      },
    },
  }
}

export function liveDataBroadcastTransmitHref(channel: string): string {
  return `/api/live/${encodeURIComponent(channel)}/data-broadcast/transmit`
}

export function liveDataBroadcastFetchHref(
  channel: string,
  uri: string,
): string {
  return `/api/live/${encodeURIComponent(channel)}/data-broadcast/fetch?${new URLSearchParams({ uri }).toString()}`
}

export function liveDataBroadcastReceiverIdHref(channel: string): string {
  return `/api/live/${encodeURIComponent(channel)}/data-broadcast/receiver-id`
}

export function liveDataBroadcastAitHref(channel: string, uri: string): string {
  return `/api/live/${encodeURIComponent(channel)}/data-broadcast/ait?${new URLSearchParams({ uri }).toString()}`
}

export function liveHybridcastTicketHref(channel: string): string {
  return `/api/live/${encodeURIComponent(channel)}/data-broadcast/app/ticket`
}

const OFF = 403

function isCode(value: unknown): value is number {
  return Number.isSafeInteger(value)
}

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

export function transmitAnswerOf(
  relayed: Relayed<TransmitAnswer>,
): TransmitAnswer {
  return relayed.said === 'answered' ? relayed.answer : RELAY_FAILED
}

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

function isPathHere(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
  )
}

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
