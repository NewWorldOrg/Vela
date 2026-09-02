import type { DetectionResult, TunerResult } from '@/repository/tuners'

export const TUNERS: TunerResult = {
  connection: 'connected',
  instanceId: 'b7f2c9',
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
  rows: [
    {
      id: 'adapter1',
      device: 'adapter1',
      hardware: 'PT3 / frontend0',
      kind: '地上波',
      enabled: true,
      session: {
        label: '録画',
        tone: 'recording',
        code: '57ch',
        endsAt: '08/07 21:15',
      },
      state: 'ok',
      stateLabel: '正常',
      lastService: { at: '08/07 20:58', ago: '6 分前' },
    },
    {
      id: 'adapter3',
      device: 'adapter3',
      hardware: 'PT3 / frontend0',
      kind: '地上波',
      enabled: false,
      draining: true,
      session: { label: 'EPG 収集', tone: 'epg', code: '53ch' },
      state: 'ok',
      stateLabel: '正常',
      lastService: { at: '08/07 20:40', ago: '24 分前' },
    },
    {
      id: 'adapter0',
      device: 'adapter0',
      hardware: 'PT3 / frontend0',
      kind: '衛星',
      enabled: true,
      idleLabel: 'アイドル',
      state: 'warn',
      stateLabel: '警告',
      stateSub: 'BS のサービスが 26 時間 0 件',
      lastService: { at: '08/06 19:02', ago: '26 時間前' },
      lnb: 'オフ(既定)',
    },
    {
      id: 'adapter2',
      device: 'adapter2',
      hardware: 'PT3 / frontend0',
      kind: '地上波',
      enabled: true,
      idleLabel: '割当停止中',
      state: 'faulted',
      stateLabel: '種別不一致',
      stateSub: '設定: 地上波 / 検出: 衛星',
      lnb: 'オフ(既定)',
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

/** Only the observation disagrees: nothing a save could write differently. */
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
