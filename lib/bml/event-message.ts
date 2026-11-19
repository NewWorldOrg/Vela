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

export function messageIdOf(event: BroadcastEvent): number {
  return event.id >> 8
}

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
