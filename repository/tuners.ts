import type { Route } from 'next'

import { CHANNEL_SCAN, TUNERS } from '@/repository/tuners.fixtures'

export interface TunerSession {
  label: string
  tone: 'recording' | 'epg'
  /** The service name. The channel or TS part goes in `code`, set in code face. */
  service?: string
  code?: string
}

export interface TunerRow {
  id: string
  device: string
  /** Model and frontend, e.g. "PT3 / frontend0". */
  hardware: string
  kind: '地上波' | '衛星'
  /** The detected kind disagrees: the chip reads "<kind> ?" in the error colour. */
  kindUnsure?: boolean
  enabled: boolean
  session?: TunerSession
  /** Shown in the session column when nothing holds the tuner. */
  idleLabel?: string
  /**
   * A disable was accepted while a session still holds the tuner: the switch
   * shows off, and the row says the stop happens once the session releases it.
   */
  draining?: boolean
  state: 'ok' | 'warn' | 'faulted'
  stateLabel: string
  /** The line under the state chip saying why, e.g. what disagrees. */
  stateSub?: string
  /** Absent renders as "—". */
  lastService?: { at: string; ago?: string }
  /** Absent renders as "—". */
  lnb?: string
}

export interface DetectionDiffRow {
  kind: 'add' | 'del'
  tag: string
  device: string
  note: string
}

/** A navigation the notice offers. */
export interface NoticeLinkAction {
  label: string
  /** Absent while the action has no page of its own to send you to. */
  href?: Route
}

/**
 * A state-changing operation the notice offers. At most one per notice. While
 * unavailable it is still offered, disabled, and the notice body carries the
 * reason and when it becomes available.
 */
export interface NoticeButtonAction {
  label: string
  control: 'button'
  disabled?: boolean
}

export type NoticeAction = NoticeLinkAction | NoticeButtonAction

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
  /** What "デバイスを検出" found against the current list, pending confirmation. */
  detectionDiff: DetectionDiffRow[]
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
