import type { Route } from 'next'

import { QUALITY } from '@/repository/quality.fixtures'

export type QualityLevel =
  | 'good'
  | 'warn'
  | 'bad'
  | 'unmeasured'
  | 'nodata'
  | 'unsupported'
  | 'unreachable'

export interface QualityStat {
  key: string
  label: string
  value?: string
  unit?: string
  level?: QualityLevel
  levelLabel?: string
  aside?: string
  link?: { href: Route; label: string }
  foot: string
}

export interface QualityThreshold {
  label: string
  value: string
  basis: string
}

export interface QualityChannel {
  name: string
  no: string
  dropRate?: string
  /** 0–100. The bar tops out at the "unwatchable" threshold. */
  barPct?: number
  level: QualityLevel
  note: string
}

export interface QualityTunerLayer {
  layer: string
  value: string
}

export interface QualityTunerCell {
  value?: string
  unit?: string
  layers?: QualityTunerLayer[]
  level?: QualityLevel
  sub?: string
  stale?: boolean
}

export interface QualityTuner {
  id: string
  device: string
  hardware: string
  state: { level: QualityLevel; label: string; recap?: string; sub: string }
  drop: QualityTunerCell
  lock: QualityTunerCell
  cnr: QualityTunerCell
  ber: QualityTunerCell
}

export interface QualityProblemRecording {
  id: string
  title: string
  where: string
  drops: string
  pct: string
  level: Extract<QualityLevel, 'warn' | 'bad'>
}

export interface QualityAnomaly {
  id: string
  title: string
  level: QualityLevel
  levelLabel: string
  recap?: string
  body: string
  meta: string
  acknowledged?: boolean
}

export interface QualityResult {
  windowLabel: string
  windowOptions: string[]
  supplyOutage?: { title: string; body: string }
  stats: QualityStat[]
  thresholds: QualityThreshold[]
  thresholdNote: string
  legend: { level: QualityLevel; label: string; body: string }[]
  channels: QualityChannel[]
  satelliteMeasured: boolean
  tuners: QualityTuner[]
  problemRecordings: QualityProblemRecording[]
  anomalies: QualityAnomaly[]
  ownedCount: number
  recapCount: number
}

export async function getQuality(): Promise<QualityResult> {
  return QUALITY
}
