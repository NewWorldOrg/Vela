import type { components } from '@/repository/client/schema'

type ScanTargetResponder = components['schemas']['ScanTargetResponder']
type ScanMeasurementResponder =
  components['schemas']['ScanMeasurementResponder']
type SessionPurpose = components['schemas']['SessionPurpose']

export type Reception = 'locked' | 'unlocked' | 'unread'

export interface Measurement {
  value: string
  percent: number
  tone: 'ok' | 'warn' | 'err'
}

export function channelLabel(target: ScanTargetResponder): string {
  const channel = toInt(target.physicalChannel)

  if (target.system === 'isdbSBs') {
    const stream = target.transportStreamId

    return stream === null
      ? `BS${channel}`
      : `BS${channel} / TS ${toInt(stream)}`
  }

  if (target.system === 'isdbSCs110') {
    return `ND${channel}`
  }

  return `${channel}ch`
}

export function tuningLabelOf(
  target: ScanTargetResponder | null,
): string | undefined {
  return target === null || target.system === 'unspecified'
    ? undefined
    : channelLabel(target)
}

export function promisedEndOf(
  purpose: SessionPurpose,
  endsAt: string | null,
): string | undefined {
  return purpose === 'recording' && endsAt !== null ? endsAt : undefined
}

export function receptionOf(
  measurement: ScanMeasurementResponder | null,
): Reception {
  if (measurement === null) {
    return 'unread'
  }

  return measurement.locked ? 'locked' : 'unlocked'
}

export function measurementOf(
  measurement: ScanMeasurementResponder | null,
): Measurement | undefined {
  if (
    measurement === null ||
    !measurement.locked ||
    measurement.cnrMilliDecibels === null
  ) {
    return undefined
  }

  const cnr = toInt(measurement.cnrMilliDecibels) / 1000

  return {
    value: `${cnr.toFixed(1)} dB`,
    percent: Math.min(100, Math.max(0, (cnr / 40) * 100)),
    tone: cnr >= 25 ? 'ok' : cnr >= 15 ? 'warn' : 'err',
  }
}

function toInt(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}
