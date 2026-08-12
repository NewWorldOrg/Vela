export type ChannelKind = 'terrestrial' | 'bs' | 'cs110'

export interface Channel {
  id: string
  no: string
  name: string
  kind: ChannelKind
  sub?: boolean
}

export const CHANNELS: Channel[] = [
  { id: 'ch-151', no: '151', name: 'みなと総合1', kind: 'terrestrial' },
  {
    id: 'ch-152',
    no: '152',
    name: 'みなと総合2',
    kind: 'terrestrial',
    sub: true,
  },
  { id: 'ch-191', no: '191', name: 'みなと教育1', kind: 'terrestrial' },
  { id: 'ch-131', no: '131', name: '中央テレビ1', kind: 'terrestrial' },
  { id: 'ch-181', no: '181', name: '第一テレビ1', kind: 'terrestrial' },
  { id: 'ch-171', no: '171', name: '湾岸放送1', kind: 'terrestrial' },
  { id: 'ch-161', no: '161', name: '東都テレビ1', kind: 'terrestrial' },
  { id: 'ch-141', no: '141', name: 'シティ MX1', kind: 'terrestrial' },
]

export const CHANNEL_KINDS: { value: ChannelKind; label: string }[] = [
  { value: 'terrestrial', label: '地上' },
  { value: 'bs', label: 'BS' },
  { value: 'cs110', label: 'CS110' },
]
