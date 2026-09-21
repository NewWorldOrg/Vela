import { WHEN_LABELS } from '@/lib/when-terms'

export const SYSTEM_DETAIL_LABELS = {
  observedAt: WHEN_LABELS.taken,
  health: 'ヘルスの応答',
  instance: 'インスタンス',
  version: 'バージョン',
  protocolVersion: 'プロトコルバージョン',
  capabilities: 'driver の機能',
} as const

export type SystemDetail = keyof typeof SYSTEM_DETAIL_LABELS
