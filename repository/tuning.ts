import type { components } from '@/repository/client/schema'

type ScanTargetResponder = components['schemas']['ScanTargetResponder']
type ScanMeasurementResponder =
  components['schemas']['ScanMeasurementResponder']
type SessionPurpose = components['schemas']['SessionPurpose']

/** How well a candidate was received the last time something tuned it. */
export type Reception = 'locked' | 'unlocked' | 'unread'

export interface Measurement {
  value: string
  percent: number
  tone: 'ok' | 'warn' | 'err'
}

/**
 * The parameters a tuning was made of, spelled the way both the channel screen
 * and the tuner screen spell them. Which values exist depends on the system:
 * terrestrial carries a physical channel, a BS slot carries the stream that
 * tells the twins apart, and CS110 carries a channel and no stream. No service
 * name belongs here — that needs the programme guide, which does not exist yet.
 */
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

/**
 * The tuning a session was started with, or nothing. `unspecified` is how the
 * contract carries an absent system rather than a fourth kind of one, so it
 * names nothing instead of a channel number nobody tuned.
 */
export function tuningLabelOf(
  target: ScanTargetResponder | null,
): string | undefined {
  return target === null || target.system === 'unspecified'
    ? undefined
    : channelLabel(target)
}

/**
 * When a session is due to end, if it is due to end at all. Only a recording
 * is started with an end of its own; every other purpose is given the driver's
 * own upper bound, which is where it gets cut off rather than when it is
 * expected to finish, and naming that as a plan would promise something nobody
 * planned.
 */
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

/**
 * An unlocked frontend answers the carrier-to-noise query with a plausible
 * figure rather than refusing, so a reading counts as a reading only once the
 * lock says so. Anything else is "could not be measured", and reception says
 * which of the two it was.
 */
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
    // The signal meter maps 0–40 dB onto its width; the number is spelled out
    // beside the bar either way.
    percent: Math.min(100, Math.max(0, (cnr / 40) * 100)),
    tone: cnr >= 25 ? 'ok' : cnr >= 15 ? 'warn' : 'err',
  }
}

function toInt(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}
