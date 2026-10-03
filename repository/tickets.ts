import { couldNot } from '@/lib/try-again'

export interface PlaybackTicket {
  inTheClear: string
  lapsesAt: string
}

export type TicketWrite =
  | { state: 'ok'; ticket: PlaybackTicket }
  | { state: 'unauthenticated' }
  | { state: 'refused'; message: string }

/** What is said when a ticket could not be issued and nothing more is known about why. */
export const NO_TICKET = couldNot('外部プレイヤーの札を発行できませんでした')

const REFUSED_WHEREVER_IT_IS_ASKED: Partial<Record<number, string>> = {
  429: '発行の上限に達しています。しばらく待つと発行できます。',
}

export function whyNoTicket(
  status: number,
  sayings: Partial<Record<number, string>>,
): TicketWrite {
  if (status === 401) {
    return { state: 'unauthenticated' }
  }

  return {
    state: 'refused',
    message:
      sayings[status] ?? REFUSED_WHEREVER_IT_IS_ASKED[status] ?? NO_TICKET,
  }
}
