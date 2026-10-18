/** An event message as the side channel carries it: its id is the 16-bit one of the descriptor, whose upper byte is the message id a document listens for and whose lower byte is that message's version, and its type is the descriptor's message type, which no document reads. When it fires is on the same 90 kHz clock as the frames, and the component tag of the stream it came on is there when the sender names it. */
export interface BroadcastEvent {
  group: number
  id: number
  type: number
  immediate: boolean
  at: number
  privateData: Uint8Array
  componentTag?: number
}

export const MOST_PRIVATE_DATA_BYTES = 0xffff

/** The message id a document listens for: the upper byte of the event message's id. */
export function messageIdOf(event: BroadcastEvent): number {
  return event.id >> 8
}

/** The version of the message: the lower byte of the event message's id, which goes up with each new message of the same message id. */
export function messageVersionOf(event: BroadcastEvent): number {
  return event.id & 0xff
}

export function isComponentTag(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= 0xff
  )
}

function isWord(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= 0xffff
  )
}

/** The event message a value carries, or null when its shape is not one. */
export function broadcastEventOf(value: unknown): BroadcastEvent | null {
  const event = value as Partial<BroadcastEvent> | null

  if (
    typeof event !== 'object' ||
    event === null ||
    !isWord(event.group) ||
    !isWord(event.id) ||
    !Number.isInteger(event.type) ||
    (event.type as number) < 0 ||
    (event.type as number) > 0xff ||
    typeof event.immediate !== 'boolean' ||
    !Number.isSafeInteger(event.at) ||
    (event.at as number) < 0 ||
    !(event.privateData instanceof Uint8Array) ||
    event.privateData.length > MOST_PRIVATE_DATA_BYTES ||
    (event.componentTag !== undefined && !isComponentTag(event.componentTag))
  ) {
    return null
  }

  return {
    group: event.group,
    id: event.id,
    type: event.type as number,
    immediate: event.immediate,
    at: event.at as number,
    privateData: event.privateData,
    ...(event.componentTag === undefined
      ? {}
      : { componentTag: event.componentTag }),
  }
}
