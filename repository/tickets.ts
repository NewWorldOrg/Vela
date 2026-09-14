export interface PlaybackTicket {
  inTheClear: string
  lapsesAt: string
}

export type TicketWrite =
  | { state: 'ok'; ticket: PlaybackTicket }
  | { state: 'unauthenticated' }
  | { state: 'refused'; message: string }

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
      sayings[status] ??
      REFUSED_WHEREVER_IT_IS_ASKED[status] ??
      `外部プレイヤーの札を発行できませんでした(${status})。`,
  }
}
