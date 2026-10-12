/** Whether a document may use the line: `on` when the viewer allows it while watching a channel live, `off` when the setting refuses it, and `none` where there is no line to use, as in a recording. */
export const LINE_STATES = ['on', 'off', 'none'] as const

export type LineState = (typeof LINE_STATES)[number]

/** The result codes `transmitTextDataOverIP` answers with (ARIB STD-B24 vol. 2). An HTTP status of 4xx or 5xx is still `done`, with the status beside it. */
export const TRANSMIT_RESULT = {
  done: 1,
  badArgument: -1,
  cut: -2,
  timedOut: -3,
  noName: -400,
  noTrust: -500,
} as const

/** The results that mean the broadcaster's server was not reached, which the viewer is told of. */
const UNREACHED: ReadonlySet<number> = new Set([
  TRANSMIT_RESULT.timedOut,
  TRANSMIT_RESULT.noName,
  TRANSMIT_RESULT.noTrust,
])

/** What one transmission came to: the result code, the HTTP status and the body received. The result is NaN when the relay itself could not be used, and the status is NaN when no HTTP answer came. */
export interface TransmitAnswer {
  result: number
  status: number
  body: string
}

/** The most a document may send in one transmission, in characters; the relay counts the bytes once the text is encoded. */
export const MOST_TRANSMIT_TEXT = 16 * 1024

/** The most the relay hands back of one answer, in characters. */
export const MOST_TRANSMIT_BODY = 256 * 1024

export const MOST_CHARSET = 32

/** What `isIPConnected` answers while the line is used: connected, automatically. */
export const IP_CONNECTED = 1

/** What `getConnectionType` answers while the line is used: Ethernet with DHCP. */
export const ETHERNET_DHCP = 403

/** The `getIRDID` type that asks for the B-CAS card's ID, its CA system id. */
export const CARD_ID_TYPE = 5

const RECEIVER_ID = /^[0-9a-f]{12}$/i

/** The card's ID as twelve hexadecimal digits, or null when the value is not one. */
export function receiverIdOf(value: unknown): string | null {
  return typeof value === 'string' && RECEIVER_ID.test(value) ? value : null
}

export function answerOf(
  result: number,
  status = Number.NaN,
  body = '',
): TransmitAnswer {
  return { result, status, body }
}

/** The answer when the relay itself failed: no result, no status. */
export const RELAY_FAILED: TransmitAnswer = answerOf(Number.NaN)

/** Whether an answer tells the viewer the broadcaster's server could not be reached. */
export function unreached(answer: TransmitAnswer): boolean {
  return Number.isNaN(answer.result) || UNREACHED.has(answer.result)
}

/** The array a document gets from `transmitTextDataOverIP`: the result, the HTTP status and the body. */
export function transmitted(answer: TransmitAnswer): [number, number, string] {
  return [answer.result, answer.status, answer.body]
}
