import type { LineState, ReceiverId } from '@/lib/bml/line'
import type { ViewingSettings } from '@/lib/viewing'
import type { LineRelay } from '@/repository/live-data-broadcast'

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
