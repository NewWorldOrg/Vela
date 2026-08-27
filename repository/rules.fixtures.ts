import type { Rule } from '@/repository/reservations'

export const RULES: Rule[] = [
  {
    id: 'rule-1',
    name: '深夜アニメを追う',
    keywords: 'アニメ',
    excludes: '再放送',
    genres: ['アニメ/特撮'],
    channels: 'すべて',
    target: '番組名・概要',
    enabled: true,
    matchCount: 4,
  },
  {
    id: 'rule-2',
    name: '映画をまとめて録る',
    keywords: 'シネマ 映画',
    genres: ['映画'],
    channels: '第一テレビ1 ほか 1',
    target: '番組名',
    enabled: true,
    matchCount: 2,
  },
  {
    id: 'rule-3',
    name: 'ドラマの最終回だけ',
    keywords: '最終回',
    genres: ['ドラマ'],
    channels: 'すべて',
    target: '番組名・概要',
    enabled: false,
    matchCount: 1,
  },
]
