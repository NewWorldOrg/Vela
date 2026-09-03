export type ChannelKind = 'terrestrial' | 'bs' | 'cs110'

export interface Channel {
  id: string
  no: string | undefined
  name: string
  kind: ChannelKind
  sub?: boolean
  /**
   * The channel this one split off, where it split off one. It is what says
   * which column a split's hours are to be read against, and a split says
   * nothing about that itself: the number in front of it is the station's, and
   * the order the columns arrived in is a sort.
   */
  whole?: string
}

/** What the tuner a reservation holds is called, where the kind itself is the value shown. */
export const CHANNEL_KIND_LABEL: Record<ChannelKind, string> = {
  terrestrial: '地上波',
  bs: 'BS',
  cs110: 'CS110',
}

export const CHANNEL_KINDS: { value: ChannelKind; label: string }[] = [
  { value: 'terrestrial', label: '地上' },
  { value: 'bs', label: 'BS' },
  { value: 'cs110', label: 'CS110' },
]
