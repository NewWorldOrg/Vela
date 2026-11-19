import type { PageEvent } from '@/lib/bml/document'
import {
  messageIdOf,
  messageVersionOf,
  type BroadcastEvent,
} from '@/lib/bml/event-message'
import { moduleAddressOf, streamTagOf, type BmlAddress } from '@/lib/bml/paths'

export const EVENT_TYPES = [
  'ModuleUpdated',
  'ModuleLocked',
  'EventMessageFired',
  'TimerFired',
  'NPTReferred',
  'DataButtonPressed',
  'MainAudioStreamChanged',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

export interface EventItem {
  id: string | null
  type: EventType | null
  attributes: Map<string, string>
  subscribed: boolean
}

const ANY = 255

function typeOf(value: string | null): EventType | null {
  return (EVENT_TYPES as readonly string[]).includes(value ?? '')
    ? (value as EventType)
    : null
}

export function eventItemsOf(events: PageEvent[]): EventItem[] {
  return events.map((event) => {
    const attributes = new Map(
      event.attributes.map(([name, value]) => [name.toLowerCase(), value]),
    )

    return {
      id: event.id,
      type: typeOf(event.type),
      attributes,
      subscribed: attributes.get('subscribe') === 'subscribe',
    }
  })
}

export function listening(
  items: readonly EventItem[],
  type: EventType,
): EventItem[] {
  return items.filter(
    (item) =>
      item.type === type && item.subscribed && item.attributes.has('onoccur'),
  )
}

function wordOf(item: EventItem, name: string): number | null {
  const value = item.attributes.get(name)

  return value !== undefined && /^\d+$/.test(value.trim())
    ? Number(value)
    : null
}

function comesOn(
  stream: number | null,
  event: BroadcastEvent,
  streams: readonly number[],
): boolean {
  if (stream === null) {
    return false
  }

  return event.componentTag === undefined
    ? streams.includes(stream)
    : event.componentTag === stream
}

export function listensFor(
  item: EventItem,
  event: BroadcastEvent,
  streams: readonly number[] = [],
): boolean {
  const reference = item.attributes.get('es_ref')
  const group = wordOf(item, 'message_group_id')
  const id = wordOf(item, 'message_id')
  const version = wordOf(item, 'message_version')

  return (
    (reference === undefined ||
      comesOn(streamTagOf(reference), event, streams)) &&
    (group === null || group === event.group) &&
    (id === null || id === ANY || id === messageIdOf(event)) &&
    (version === null || version === ANY || version === messageVersionOf(event))
  )
}

export function namesModule(
  item: EventItem,
  base: BmlAddress,
  module: { tag: number; id: number },
): boolean {
  const reference = item.attributes.get('module_ref')
  const named =
    reference === undefined ? null : moduleAddressOf(reference, base)

  return (
    named !== null && named.tag === module.tag && named.module === module.id
  )
}

const utf8 = new TextDecoder('utf-8', { fatal: true })

export function privateDataOf(bytes: Uint8Array): string {
  try {
    return utf8.decode(bytes)
  } catch {
    return Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  }
}
