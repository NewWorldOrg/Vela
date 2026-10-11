/** An event message as the side channel carries it: when it fires is on the same 90 kHz clock as the frames. */
export interface BroadcastEvent {
  group: number
  id: number
  type: number
  immediate: boolean
  at: number
  privateData: Uint8Array
}

export const MOST_PRIVATE_DATA_BYTES = 0xffff

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
    event.privateData.length > MOST_PRIVATE_DATA_BYTES
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
  }
}
