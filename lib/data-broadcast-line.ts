import type { LineState } from '@/lib/bml/line'
import type { LineRelay } from '@/repository/live-data-broadcast'

/** Whether the documents may use the line, the card's ID they may be given, and the relay that reaches the broadcaster's server. */
export interface DataBroadcastLine {
  state: LineState
  receiverId: string | null
  relay: LineRelay | null
}

/** A recording has no line. */
export const NO_LINE: DataBroadcastLine = {
  state: 'none',
  receiverId: null,
  relay: null,
}

/** The line of a channel watched live, by the viewer's two settings: the line is used only when allowed, and the card's ID the catalog carries is handed over only when that is allowed too. */
export function liveLine(
  allowsTheLine: boolean,
  handsTheReceiverId: boolean,
  receiverId: string | null,
  relay: LineRelay | null,
): DataBroadcastLine {
  return {
    state: allowsTheLine ? 'on' : 'off',
    receiverId: allowsTheLine && handsTheReceiverId ? receiverId : null,
    relay,
  }
}
