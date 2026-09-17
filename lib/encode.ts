import { wordFor } from '@/lib/not-yet-in-this-build'
import type { EncodeJob } from '@/repository/encode'
import {
  ENCODE_JOB_STATUSES,
  FAILURE_LABEL,
  LABEL_LONGEST,
  NOT_ASKED_FOR_LABEL,
  RATE_CONTROL_COARSEST,
  RATE_CONTROL_FINEST,
  STALLED_LABEL,
  STANDING_LABEL,
  STATUS_LABEL,
  type EncodeJobStatus,
  type EncodeStanding,
} from '@/repository/encode-terms'

type Asked = string | string[] | undefined

export const WAITING_FOR_A_VIEWER_LABEL = '視聴者待ち'

export interface EncodeRowWords {
  main: string
  sub?: string
  cancels: boolean
}

export function standingWordOf(
  standing: EncodeStanding,
  whenRecorded: boolean,
): string {
  return standing === 'notEncoded' && !whenRecorded
    ? NOT_ASKED_FOR_LABEL
    : wordFor(STANDING_LABEL, standing)
}

export function encodeRowOf(
  job:
    | Pick<EncodeJob, 'status' | 'failure' | 'stalled' | 'waitingForAViewer'>
    | undefined,
  standing: EncodeStanding,
  whenRecorded: boolean,
): EncodeRowWords {
  const folded: EncodeRowWords = {
    main: standingWordOf(standing, whenRecorded),
    cancels: false,
  }

  if (!job) {
    return folded
  }

  if (job.status === 'cancelled') {
    return standing === 'notEncoded'
      ? { main: STATUS_LABEL.cancelled, cancels: false }
      : folded
  }

  if (job.status !== standing) {
    return folded
  }

  const told: EncodeRowWords = {
    main: wordFor(STATUS_LABEL, job.status),
    cancels: callsOff(job.status),
  }

  if (job.failure) {
    return { ...told, sub: wordFor(FAILURE_LABEL, job.failure.failure) }
  }

  if (job.waitingForAViewer) {
    return { ...told, sub: WAITING_FOR_A_VIEWER_LABEL }
  }

  if (job.stalled) {
    return { ...told, sub: STALLED_LABEL }
  }

  return told
}

function onlyOne(asked: Asked): string | undefined {
  return Array.isArray(asked) ? asked[0] : asked
}

export function jobStatusIn(asked: Asked): EncodeJobStatus | undefined {
  const raw = onlyOne(asked)

  return (ENCODE_JOB_STATUSES as string[]).includes(raw ?? '')
    ? (raw as EncodeJobStatus)
    : undefined
}

export function pageIn(asked: Asked): number {
  const raw = onlyOne(asked)

  return raw !== undefined && /^[1-9]\d*$/.test(raw) ? Number(raw) : 1
}

export function headwayPercent(
  portion: number | string | null | undefined,
): number | undefined {
  if (portion === null || portion === undefined) {
    return undefined
  }

  return Math.round(Number(portion) * 100)
}

export function secondsBetween(fromIso: string, to: Date): number {
  return Math.max(
    0,
    Math.floor((to.getTime() - new Date(fromIso).getTime()) / 1000),
  )
}

export function callsOff(status: EncodeJobStatus): boolean {
  return status === 'queued' || status === 'running'
}

export function asksBeforeCallingOff(status: EncodeJobStatus): boolean {
  return status === 'running'
}

export function labelProblem(label: string): string | undefined {
  const trimmed = label.trim()

  if (trimmed.length === 0) {
    return '名称を入力してください。'
  }

  if (trimmed.length > LABEL_LONGEST) {
    return `名称は ${LABEL_LONGEST} 文字までです。`
  }

  return undefined
}

export function rateControlProblem(value: string): string | undefined {
  const trimmed = value.trim()

  if (!/^\d+$/.test(trimmed)) {
    return '半角数字で入力してください。'
  }

  const read = Number(trimmed)

  if (read < RATE_CONTROL_FINEST || read > RATE_CONTROL_COARSEST) {
    return `${RATE_CONTROL_FINEST} 〜 ${RATE_CONTROL_COARSEST} です。`
  }

  return undefined
}
