import type { AppStart } from '@/lib/bml/ait'
import type { LineState, ReceiverId } from '@/lib/bml/line'
import type { RuntimeMessage } from '@/lib/bml/messages'
import type { ViewingSettings } from '@/lib/viewing'
import type {
  LineRelay,
  Relayed,
  StartedApplication,
} from '@/repository/live-data-broadcast'

/** Whether the documents may use the line, the receiver's identifier they may be given, whether they may start a Hybridcast application, and the relay that reaches the broadcaster's server. */
export interface DataBroadcastLine {
  state: LineState
  receiverId: ReceiverId | null
  hybridcast: boolean
  relay: LineRelay | null
}

/** The viewer's settings the line is used by. */
export type LineSettings = Pick<
  ViewingSettings,
  'allowsTheLine' | 'handsTheReceiverId' | 'allowsHybridcast'
>

/** A recording has no line. */
export const NO_LINE: DataBroadcastLine = {
  state: 'none',
  receiverId: null,
  hybridcast: false,
  relay: null,
}

/** The line of a channel watched live, by the viewer's settings: the line is used only when allowed, and the identifier Carina named is handed over, and an application started, only when that is allowed too. */
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

/** How the player asks Carina to start the application the documents asked for. */
export type StartApplication = (
  start: AppStart,
) => Promise<Relayed<StartedApplication>>

/** The way an application is started, only while the viewer allows Hybridcast: otherwise none, and a start the documents ask for does not open. */
export function applicationStarter(
  line: DataBroadcastLine,
): StartApplication | null {
  return line.hybridcast && line.relay ? line.relay.startApplication : null
}

/** Whether the player takes what the documents said: a start of an application only while the viewer allows Hybridcast, as the documents' frame can say anything; the rest as it always has. */
export function takenFromTheDocuments(
  message: RuntimeMessage,
  line: DataBroadcastLine,
): boolean {
  return message.kind !== 'startApp' || line.hybridcast
}
