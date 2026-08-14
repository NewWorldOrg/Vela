import type { Route } from 'next'

import { CHANNEL_SCAN, TUNERS } from '@/repository/tuners.fixtures'

export interface TunerRow {
  id: string
  device: string
  hardware: string
  kind: '地上波' | '衛星'
  enabled: boolean
  session?: { label: string; service: string }
  state: 'ok' | 'faulted' | 'idle'
  stateLabel: string
  lastService: string
  lnb?: boolean
}

export interface NoticeAction {
  label: string
  /** Absent while the action has no page of its own to send you to. */
  href?: Route
}

/** Two at most, in the order they are offered. */
export type NoticeActions =
  readonly [NoticeAction] | readonly [NoticeAction, NoticeAction]

export interface TunerNotice {
  tone: 'danger' | 'warn'
  body: string
  actions?: NoticeActions
}

export interface TunerResult {
  instanceId: string
  notices: TunerNotice[]
  thresholdHours: number
  rows: TunerRow[]
}

export async function getTuners(): Promise<TunerResult> {
  return TUNERS
}

export interface ServiceRow {
  id: string
  name: string
  sid: string
  kind: 'TV' | 'ワンセグ' | 'データ'
  currentCh: string
  candidates: number
  needsCheck: number
  enabled: boolean
  lastSeen: string
}

export interface ChannelsResult {
  warning?: { body: string; actions?: NoticeActions }
  lastScan: string
  groups: {
    kind: string
    stat: string
    services: ServiceRow[]
  }[]
}

export async function getChannelScan(): Promise<ChannelsResult> {
  return CHANNEL_SCAN
}
