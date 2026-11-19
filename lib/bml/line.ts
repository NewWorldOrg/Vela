export const LINE_STATES = ['on', 'off', 'none'] as const

export type LineState = (typeof LINE_STATES)[number]

export const TRANSMIT_RESULT = {
  done: 1,
  badArgument: -1,
  cut: -2,
  timedOut: -3,
  noName: -400,
  noTrust: -500,
} as const

const UNREACHED: ReadonlySet<number> = new Set([
  TRANSMIT_RESULT.timedOut,
  TRANSMIT_RESULT.noName,
  TRANSMIT_RESULT.noTrust,
])

export interface TransmitAnswer {
  result: number
  status: number
  body: string
}

export const MOST_TRANSMIT_TEXT = 16 * 1024

export const MOST_TRANSMIT_BODY = 256 * 1024

export const MOST_CHARSET = 32

export const IP_CONNECTED = 1

export const ETHERNET_DHCP = 403

export interface ReceiverId {
  caSystemId: number
  cardId: string
}

const CARD_ID = /^[0-9a-f]{12}$/i

const MOST_CA_SYSTEM_ID = 0xffff

export function receiverIdOf(value: unknown): ReceiverId | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const { caSystemId, cardId } = value as Record<string, unknown>

  return Number.isSafeInteger(caSystemId) &&
    (caSystemId as number) > 0 &&
    (caSystemId as number) <= MOST_CA_SYSTEM_ID &&
    typeof cardId === 'string' &&
    CARD_ID.test(cardId)
    ? { caSystemId: caSystemId as number, cardId }
    : null
}

export function answerOf(
  result: number,
  status = Number.NaN,
  body = '',
): TransmitAnswer {
  return { result, status, body }
}

export const RELAY_FAILED: TransmitAnswer = answerOf(Number.NaN)

export function unreached(answer: TransmitAnswer): boolean {
  return Number.isNaN(answer.result) || UNREACHED.has(answer.result)
}

export function transmitted(answer: TransmitAnswer): [number, number, string] {
  return [answer.result, answer.status, answer.body]
}
