import {
  ENCODE_JOB_STATUSES,
  LABEL_LONGEST,
  RATE_CONTROL_COARSEST,
  RATE_CONTROL_FINEST,
  type EncodeJobStatus,
} from '@/repository/encode-terms'

type Asked = string | string[] | undefined

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
