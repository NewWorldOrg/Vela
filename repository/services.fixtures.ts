import type {
  ChannelsResult,
  ScanProposal,
  ScanRunProgress,
  ServiceRow,
} from '@/repository/services'
import { FAILURE_CLASSES } from '@/repository/services'

const [NO_LOCK, NO_DATA, INCOMPLETE, MISMATCH] = FAILURE_CLASSES

const SERVICES: ServiceRow[] = [
  {
    key: '50001-1024',
    name: 'みなと総合1',
    sid: 'sid 1024',
    category: 'TV',
    minorCategory: false,
    currentChannel: '53ch',
    enabled: true,
    candidateCount: 2,
    needsAttentionCount: 1,
    lastSeen: '08/15 03:20',
    candidates: [
      {
        id: 'candidate-53',
        channel: '53ch',
        selected: true,
        measurement: { value: '31.2 dB', percent: 78, tone: 'ok' },
        discovered: '2025/07',
        lastSeen: '08/15 03:20',
      },
      {
        id: 'candidate-55',
        channel: '55ch',
        selected: false,
        rotation: {
          dropped: true,
          label: '要確認 · 連続失敗 12 回',
          note: '巡回対象から外しました',
        },
        discovered: '2024/02',
        lastSeen: '08/06 03:38',
      },
    ],
  },
  {
    key: '50001-1025',
    name: 'みなと総合2',
    sid: 'sid 1025',
    category: 'ワンセグ',
    minorCategory: true,
    currentChannel: '53ch',
    enabled: false,
    candidateCount: 1,
    needsAttentionCount: 0,
    lastSeen: '08/15 03:20',
    candidates: [
      {
        id: 'candidate-53-oneseg',
        channel: '53ch',
        selected: true,
        measurement: { value: '31.2 dB', percent: 78, tone: 'ok' },
        discovered: '2025/07',
        lastSeen: '08/15 03:20',
      },
    ],
  },
  {
    key: '50001-1040',
    name: '中央テレビ1',
    sid: 'sid 1040',
    category: 'TV',
    minorCategory: false,
    enabled: true,
    candidateCount: 1,
    needsAttentionCount: 0,
    lastSeen: '08/12 03:38',
    candidates: [
      {
        id: 'candidate-57',
        channel: '57ch',
        selected: false,
        measurement: { value: '18.4 dB', percent: 46, tone: 'warn' },
        rotation: {
          dropped: false,
          label: '再試行待ち · 連続失敗 4 回',
          note: '次の試行 08/15 04:18',
        },
        discovered: '2024/02',
        lastSeen: '08/12 03:38',
      },
    ],
  },
  {
    key: '50001-1072',
    name: '湾岸放送1',
    sid: 'sid 1072',
    category: 'TV',
    minorCategory: false,
    enabled: true,
    candidateCount: 0,
    needsAttentionCount: 0,
    lastSeen: '08/01 03:38',
    candidates: [],
  },
]

export const CHANNELS: ChannelsResult = {
  unattributed: [SERVICES[3]],
  groups: [
    {
      system: 'isdbT',
      label: '地上波',
      services: SERVICES.slice(0, 3),
      stat: '3 サービス(TV 2 · ワンセグ 1)',
      neverScanned: false,
    },
    {
      system: 'isdbSBs',
      label: 'BS',
      services: [],
      stat: '0 サービス',
      neverScanned: false,
      diagnosis: {
        scannedAt: '08/14 19:00',
        attempted: 10,
        counts: [
          { class: NO_LOCK, count: 10 },
          { class: NO_DATA, count: 0 },
          { class: INCOMPLETE, count: 0 },
          { class: MISMATCH, count: 0 },
        ],
        verdict:
          '走査した 10 件すべてが「1 信号を掴めない」で止まっています。チューナーが同調できない状態が全体に及んでいます。',
      },
    },
    {
      system: 'isdbSCs110',
      label: 'CS110',
      services: [],
      stat: '0 サービス',
      neverScanned: true,
    },
  ],
  history: [
    {
      id: 'run-2',
      state: 'completed',
      stateLabel: '完了',
      startedAt: '08/14 19:00',
      finishedAt: '08/14 19:06',
      took: '6分32秒',
    },
    {
      id: 'run-1',
      state: 'cancelled',
      stateLabel: 'キャンセル',
      startedAt: '08/13 03:00',
      finishedAt: '08/13 03:02',
      took: '2分47秒',
    },
  ],
}

export const SCAN_RUNNING: ScanRunProgress = {
  run: {
    id: 'run-3',
    state: 'running',
    stateLabel: '実行中',
    startedAt: '08/15 03:35',
  },
  attempted: 4,
  succeeded: 1,
  failed: 3,
  systems: '地上波',
  elapsed: '1分36秒',
  attempts: [
    {
      channel: '56ch',
      failure: MISMATCH,
      streamMismatch: '期待 TSID 32741 / 受信 TSID 32738',
      measurement: { value: '30.4 dB', percent: 76, tone: 'ok' },
      took: '11秒',
      at: '08/15 03:37',
    },
    {
      channel: '55ch',
      failure: INCOMPLETE,
      measurement: { value: '21.8 dB', percent: 55, tone: 'warn' },
      took: '14秒',
      at: '08/15 03:36',
    },
    {
      channel: '54ch',
      failure: NO_DATA,
      measurement: { value: '24.6 dB', percent: 62, tone: 'warn' },
      took: '8秒',
      at: '08/15 03:36',
    },
    {
      channel: '53ch',
      took: '7秒',
      measurement: { value: '31.2 dB', percent: 78, tone: 'ok' },
      at: '08/15 03:35',
    },
  ],
}

export const SCAN_PROPOSAL: ScanProposal = {
  run: {
    id: 'run-3',
    state: 'completed',
    stateLabel: '完了',
    startedAt: '08/15 03:35',
    finishedAt: '08/15 03:42',
    took: '6分32秒',
  },
  succeeded: 3,
  empty: false,
  added: [
    {
      key: '50001-1090',
      name: '東都テレビ1',
      sid: 'sid 1090',
      category: 'TV',
      channels: [
        {
          kind: 'added',
          channel: '58ch',
          measurement: { value: '28.4 dB', percent: 71, tone: 'ok' },
        },
      ],
    },
  ],
  updated: [
    {
      key: '50001-1024',
      name: 'みなと総合1',
      sid: 'sid 1024',
      category: 'TV',
      channels: [
        {
          kind: 'updated',
          channel: '53ch',
          measurement: { value: '31.2 dB', percent: 78, tone: 'ok' },
        },
        {
          kind: 'added',
          channel: '60ch',
          measurement: { value: '26.7 dB', percent: 67, tone: 'ok' },
        },
      ],
    },
  ],
  missing: [
    {
      key: '50001-1072',
      name: '湾岸放送1',
      sid: 'sid 1072',
      category: 'TV',
      channels: [{ kind: 'missing', channel: '62ch' }],
    },
  ],
  leftRotation: [
    {
      key: '50001-1024',
      channel: '55ch',
      consecutiveFailures: 12,
      since: '08/06 03:38',
    },
  ],
  failures: [
    {
      channel: '54ch',
      failure: NO_LOCK,
      took: '5秒',
      at: '08/15 03:36',
    },
    {
      channel: '55ch',
      failure: INCOMPLETE,
      measurement: { value: '21.8 dB', percent: 55, tone: 'warn' },
      took: '14秒',
      at: '08/15 03:36',
    },
  ],
}
