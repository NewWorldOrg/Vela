export type ChannelKind = 'terrestrial' | 'bs' | 'cs110'

export interface Channel {
  id: string
  no: string | undefined
  name: string
  kind: ChannelKind
  sub?: boolean
}

export const CHANNEL_KINDS: { value: ChannelKind; label: string }[] = [
  { value: 'terrestrial', label: '地上' },
  { value: 'bs', label: 'BS' },
  { value: 'cs110', label: 'CS110' },
]
