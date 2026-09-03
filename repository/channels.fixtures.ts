import type { Channel } from '@/repository/channels'

export const CHANNEL_FIXTURES: Channel[] = [
  { id: 'ch-151', no: '151', name: 'みなと総合1', kind: 'terrestrial' },
  {
    id: 'ch-152',
    no: '152',
    name: 'みなと総合2',
    kind: 'terrestrial',
    sub: true,
    whole: 'ch-151',
  },
  { id: 'ch-191', no: '191', name: 'みなと教育1', kind: 'terrestrial' },
  { id: 'ch-131', no: '131', name: '中央テレビ1', kind: 'terrestrial' },
  { id: 'ch-181', no: '181', name: '第一テレビ1', kind: 'terrestrial' },
  { id: 'ch-171', no: '171', name: '湾岸放送1', kind: 'terrestrial' },
  { id: 'ch-161', no: '161', name: '東都テレビ1', kind: 'terrestrial' },
  { id: 'ch-141', no: '141', name: 'シティ MX1', kind: 'terrestrial' },
]

/**
 * The scale one aerial reaches: 27 television services, once the one-segment,
 * temporary and data services that never take a column of their own are left
 * out. It is the count a grid has to stay readable at, and the eight above are
 * the head of it, so a screen drawn from this list still holds the programmes
 * written for them.
 */
export const AERIAL_CHANNEL_FIXTURES: Channel[] = [
  ...CHANNEL_FIXTURES,
  { id: 'ch-031', no: '031', name: '内海テレビ1', kind: 'terrestrial' },
  {
    id: 'ch-032',
    no: '032',
    name: '内海テレビ2',
    kind: 'terrestrial',
    sub: true,
    whole: 'ch-031',
  },
  { id: 'ch-041', no: '041', name: '房総テレビ1', kind: 'terrestrial' },
  { id: 'ch-051', no: '051', name: '武蔵テレビ1', kind: 'terrestrial' },
  { id: 'ch-061', no: '061', name: '甲斐テレビ1', kind: 'terrestrial' },
  { id: 'ch-071', no: '071', name: '上州テレビ1', kind: 'terrestrial' },
  { id: 'ch-081', no: '081', name: '相模テレビ1', kind: 'terrestrial' },
  { id: 'ch-091', no: '091', name: '常磐テレビ1', kind: 'terrestrial' },
  { id: 'ch-101', no: '101', name: '北総放送1', kind: 'terrestrial' },
  { id: 'ch-111', no: '111', name: '西湘テレビ1', kind: 'terrestrial' },
  { id: 'ch-121', no: '121', name: '多摩テレビ1', kind: 'terrestrial' },
  { id: 'ch-201', no: '201', name: '港南放送1', kind: 'terrestrial' },
  { id: 'ch-211', no: '211', name: '江戸川テレビ1', kind: 'terrestrial' },
  { id: 'ch-221', no: '221', name: '高原テレビ1', kind: 'terrestrial' },
  { id: 'ch-231', no: '231', name: '潮騒放送1', kind: 'terrestrial' },
  { id: 'ch-241', no: '241', name: 'みどりテレビ1', kind: 'terrestrial' },
  { id: 'ch-251', no: '251', name: '白樺テレビ1', kind: 'terrestrial' },
  { id: 'ch-261', no: '261', name: '青葉テレビ1', kind: 'terrestrial' },
  { id: 'ch-271', no: '271', name: 'いずみテレビ1', kind: 'terrestrial' },
]
