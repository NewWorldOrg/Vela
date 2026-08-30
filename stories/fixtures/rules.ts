import type { GuideChannel } from '@/repository/programs'
import type { Rule } from '@/repository/rules'

export const RULE_CHANNEL_FIXTURES: GuideChannel[] = [
  {
    id: '131-1310',
    no: '011',
    name: '中央テレビ1',
    kind: 'terrestrial',
    networkId: 131,
    serviceId: 1310,
    sortKey: [0, 11, 1310],
  },
  {
    id: '132-1320',
    no: '041',
    name: '湾岸放送1',
    kind: 'terrestrial',
    networkId: 132,
    serviceId: 1320,
    sortKey: [0, 41, 1320],
  },
  {
    id: '4-101',
    no: '101',
    name: '衛星第一',
    kind: 'bs',
    networkId: 4,
    serviceId: 101,
    sortKey: [1, 101, 101],
  },
]

/**
 * Three rules that differ in the ways the screen has to draw differently: one
 * switched on with a keyword and an exclusion, one switched on that narrows by
 * genre and channel alone, and one switched off. A set that was all switched on
 * would leave the off branch undrawn in every story.
 */
export const RULE_FIXTURES: Rule[] = [
  {
    id: 'rule-301',
    name: '深夜アニメを追う',
    terms: {
      q: '新番組',
      exclude: '再放送',
      fields: 'title,description',
      genres: ['anime'],
      channels: [],
    },
    priority: 20,
    enabled: true,
    marginBeforeSeconds: 10,
    marginAfterSeconds: 30,
    createdAt: '2026-08-01T02:00:00Z',
  },
  {
    id: 'rule-302',
    name: '映画をまとめて録る',
    terms: {
      q: undefined,
      exclude: undefined,
      fields: 'title',
      genres: ['movie'],
      channels: ['131-1310', '4-101'],
    },
    priority: 10,
    enabled: true,
    marginBeforeSeconds: 0,
    marginAfterSeconds: 0,
    createdAt: '2026-07-20T05:30:00Z',
  },
  {
    id: 'rule-303',
    name: 'ドラマの最終回だけ',
    terms: {
      q: '最終回',
      exclude: undefined,
      fields: 'title,description',
      genres: ['drama'],
      kind: 'terrestrial',
      channels: [],
    },
    priority: 5,
    enabled: false,
    marginBeforeSeconds: 0,
    marginAfterSeconds: 0,
    createdAt: '2026-07-02T11:00:00Z',
  },
]
