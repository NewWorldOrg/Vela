import type {
  CardReaderRow,
  DetectionResult,
  TunerResult,
} from '@/repository/tuners'

export const CARD_READERS: CardReaderRow[] = [
  {
    id: 'reader-0',
    title: 'Example Card Reader',
    sub: '使用中',
    status: { word: '挿入', tone: 'plain', line: '20:58 に応答' },
  },
]

export const TUNERS: TunerResult = {
  connection: 'connected',
  instanceId: 'b7f2c9',
  facts: {
    version: '0.3.7',
    startedAt: '08/05(水) 12:40',
    respondedAt: '20:58',
    machine: 'living-room',
  },
  cardReaders: CARD_READERS,
  notices: [
    {
      tone: 'danger',
      body: '1台のチューナーが利用できません。adapter2 — 設定の種別(地上波)と検出結果(衛星)が一致しません。',
      actions: [{ label: '該当行へ', href: '#adapter2' }],
    },
    {
      tone: 'warn',
      body: '保存済み・未反映の変更があります。',
      restart: { recordings: 1, until: '08/07 21:15' },
    },
  ],
  thresholdHours: 24,
  reach: [
    {
      system: 'isdbT',
      label: '地上波',
      level: 'reaching',
      services: 27,
      lastSeenAt: '2026-08-07T11:58:00.000Z',
    },
  ],
  rows: [
    {
      id: 'adapter1',
      device: 'adapter1',
      name: 'Example ISDB-T frontend',
      place: 'example_dvb · /dev/dvb/adapter1/frontend0',
      status: {
        word: '録画中',
        tone: 'rec',
        line: 'Example Programme · 21:15 まで',
      },
      kind: '地上波',
      enabled: true,
      session: {
        label: '録画',
        title: 'Example Programme',
        tone: 'recording',
        code: '57ch',
        endsAt: '08/07 21:15',
      },
      state: 'ok',
      stateLabel: '正常',
      lastService: { at: '08/07 20:58' },
    },
    {
      id: 'adapter3',
      device: 'adapter3',
      name: 'Example ISDB-T frontend',
      place: 'example_dvb · /dev/dvb/adapter3/frontend0',
      status: { word: '停止準備中', tone: 'plain', line: '53ch' },
      kind: '地上波',
      enabled: false,
      draining: true,
      session: { label: 'EPG 収集', tone: 'epg', code: '53ch' },
      state: 'ok',
      stateLabel: '正常',
      lastService: { at: '08/07 20:40' },
    },
    {
      id: 'adapter0',
      device: 'adapter0',
      name: 'Example ISDB-S frontend',
      place: 'example_dvb · /dev/dvb/adapter0/frontend0',
      status: { word: '警告', tone: 'warn', line: '20:58 に確認' },
      kind: '衛星',
      enabled: true,
      idleLabel: 'アイドル',
      state: 'warn',
      stateLabel: '警告',
      stateSub: 'BS のサービスが 26 時間 0 件',
      lastService: { at: '08/06 19:02' },
      lnb: { saved: false, applied: false },
    },
    {
      id: 'adapter2',
      device: 'adapter2',
      name: 'Example ISDB-S frontend',
      place: 'example_dvb · /dev/dvb/adapter2/frontend0',
      status: { word: '異常', tone: 'err', line: '20:58 に確認' },
      kind: '地上波',
      enabled: true,
      idleLabel: '割当停止中',
      state: 'faulted',
      stateLabel: '異常',
      stateSub:
        '一覧では地上波、このチューナーが受信できるのは衛星。一致するまで割り当てられない。',
    },
  ],
}

export const DETECTION: DetectionResult = {
  detected: ['adapter0', 'adapter1', 'adapter4'],
  changes: true,
  rows: [
    {
      kind: 'add',
      tag: '新規',
      device: 'adapter4',
      note: '地上波として検出されました',
    },
    {
      kind: 'add',
      tag: '新規',
      device: 'adapter5',
      note: 'アクセス権がないため保存されません',
    },
    {
      kind: 'del',
      tag: '消失',
      device: 'adapter2',
      note: '接続が確認できません',
    },
    {
      kind: 'kind',
      tag: '種別相違',
      device: 'adapter1',
      note: '一覧は 衛星 / 検出は 地上波',
    },
  ],
}

export const DETECTION_MISMATCH_ONLY: DetectionResult = {
  detected: ['adapter0', 'adapter1', 'adapter2', 'adapter3'],
  changes: false,
  rows: [
    {
      kind: 'kind',
      tag: '種別相違',
      device: 'adapter1',
      note: '一覧は 衛星 / 検出は 地上波',
    },
  ],
}
