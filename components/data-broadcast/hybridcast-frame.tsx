'use client'

import type { ReceiverId } from '@/lib/bml/line'
import type { DataBroadcastHeld } from '@/lib/data-broadcast-feed'
import type { AppEnd } from '@/lib/data-broadcast-view'
import type { EventInformation } from '@/lib/hybridcast/event-information'
import {
  type AppMessage,
  type OwnedApplication,
  type ReceiverMessage,
} from '@/lib/hybridcast/messages'

/** How the player talks to the application's document that opened last. */
export type SendToApp = (message: ReceiverMessage) => void

/** What the player hears of the application: what its documents say, and the frame lost, and why. */
export type AppHeard =
  | Exclude<AppMessage, { kind: 'memory' | 'loaded' | 'leave' }>
  | { kind: 'lost'; end: AppEnd }

export interface FrameProps {
  address: string
  application: OwnedApplication
  feed: DataBroadcastHeld
  service: number | null
  programme: EventInformation | null
  receiverId: ReceiverId | null
  greg: readonly string[] | null
  keysTo: HTMLElement | null
  onHeard: (message: AppHeard) => void
  onSender: (send: SendToApp | null) => void
}
