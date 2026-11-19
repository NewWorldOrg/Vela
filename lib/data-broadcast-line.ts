import type { AppStart } from '@/lib/bml/ait'
import type { LineState, ReceiverId } from '@/lib/bml/line'
import type { RuntimeMessage } from '@/lib/bml/messages'
import type { ViewingSettings } from '@/lib/viewing'
import type {
  LineRelay,
  Relayed,
  StartedApplication,
} from '@/repository/live-data-broadcast'

export interface DataBroadcastLine {
  state: LineState
  receiverId: ReceiverId | null
  hybridcast: boolean
  relay: LineRelay | null
}

export type LineSettings = Pick<
  ViewingSettings,
  'allowsTheLine' | 'handsTheReceiverId' | 'allowsHybridcast'
>

export const NO_LINE: DataBroadcastLine = {
  state: 'none',
  receiverId: null,
  hybridcast: false,
  relay: null,
}

export function liveLine(
  settings: LineSettings,
  receiverId: ReceiverId | null,
  relay: LineRelay | null,
): DataBroadcastLine {
  const { allowsTheLine, handsTheReceiverId, allowsHybridcast } = settings

  return {
    state: allowsTheLine ? 'on' : 'off',
    receiverId: allowsTheLine && handsTheReceiverId ? receiverId : null,
    hybridcast: allowsTheLine && allowsHybridcast,
    relay,
  }
}

export type StartApplication = (
  start: AppStart,
) => Promise<Relayed<StartedApplication>>

export function applicationStarter(
  line: DataBroadcastLine,
): StartApplication | null {
  return line.hybridcast && line.relay ? line.relay.startApplication : null
}

export function takenFromTheDocuments(
  message: RuntimeMessage,
  line: DataBroadcastLine,
): boolean {
  return message.kind !== 'startApp' || line.hybridcast
}
