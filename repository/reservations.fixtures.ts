import type { Reservation, Rule } from '@/repository/reservations'

export const RESERVATIONS: Reservation[] = [
  {
    id: 'r-301',
    title: '週末キッチンの手帖',
    note: '夏野菜の作り置き',
    channelName: '湾岸放送1',
    channelNo: '171',
    whenLabel: '08/08(金) 21:10–22:40',
    whenNote: '今夜',
    origin: '手動',
    state: 'secured',
  },
  {
    id: 'r-302',
    title: 'ナイター中継 延長あり',
    note: '延長の可能性あり',
    channelName: '湾岸放送1',
    channelNo: '171',
    whenLabel: '08/08(金) 23:30–01:00',
    whenNote: '今夜',
    origin: '手動',
    state: 'endUndecided',
    stateNote: '延長時は終了に自動で追従します',
  },
  {
    id: 'r-303',
    title: '金曜シネマ「星の渡り鳥」',
    note: '岬の観測小屋を舞台にしたひと夏の物語',
    channelName: '第一テレビ1',
    channelNo: '181',
    whenLabel: '08/08(金) 22:00–24:00',
    whenNote: '今夜',
    origin: 'ルール',
    ruleName: '映画をまとめて録る',
    state: 'conflict',
    conflict: {
      headline: '同時刻に地上波チューナー 2 本が録画予定です',
      body: '08/08(金) 22:00 の開始時点で空きがなく、この予約にはチューナーを割り当てられません。',
      entries: [
        {
          title: '週末キッチンの手帖',
          meta: '湾岸放送1 · 21:10–22:40',
          origin: '手動',
        },
        {
          title: '水曜ドラマ「約束の丘」',
          meta: '中央テレビ1 · 22:00–23:00',
          origin: 'ルール',
          ruleName: 'ドラマの最終回だけ',
        },
      ],
    },
  },
  {
    id: 'r-304',
    title: '深夜アニメ劇場',
    channelName: 'みなと教育1',
    channelNo: '191',
    whenLabel: '08/09(土) 01:00–03:00',
    origin: 'ルール',
    ruleName: '深夜アニメを追う',
    state: 'secured',
  },
]

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

export async function listReservations() {
  return RESERVATIONS
}

export async function listRules() {
  return RULES
}
