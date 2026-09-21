import { WHEN_LABELS } from '@/lib/when-terms'

export const SYSTEM_DETAIL_LABELS = {
  observedAt: WHEN_LABELS.taken,
  health: 'ヘルスの応答',
  version: 'バージョン',
  protocolVersion: 'プロトコルバージョン',
  capabilities: 'driver の機能',
} as const

export type SystemDetail = keyof typeof SYSTEM_DETAIL_LABELS

export const SYSTEM_STATE_LABELS = {
  responding: '応答あり',
  notResponding: '応答なし',
  signedOut: '未サインイン',
  unknown: '状態不明',
  unreadable: '取得失敗',
} as const

export type SystemState = keyof typeof SYSTEM_STATE_LABELS
