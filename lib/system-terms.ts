export const SYSTEM_DETAIL_LABELS = {
  observedAt: '取得日時',
  health: 'ヘルスの応答',
  instance: 'インスタンス',
  version: 'バージョン',
  protocolVersion: 'プロトコルバージョン',
  capabilities: 'driver の機能',
} as const

export type SystemDetail = keyof typeof SYSTEM_DETAIL_LABELS
