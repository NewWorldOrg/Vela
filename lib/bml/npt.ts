/** A data stream's NPT reference as the side channel carries it: at the moment `stc` of the 90 kHz clock the frames are on, the stream's NPT reads `npt`, and from there it runs at `numerator / denominator`. */
export interface NptReference {
  tag: number
  stc: number
  npt: number
  numerator: number
  denominator: number
}

/** A stream's NPT as a runtime keeps it: the NPT in milliseconds at the moment it is handed over, and the rate it runs at against the clock from then on. */
export interface NptReading {
  tag: number
  milliseconds: number
  rate: number
}

/** The NPT and the clock the frames are on both count at 90 kHz. */
export const NPT_HERTZ = 90_000

export const NPT_MODULUS = 2 ** 33

const TICKS_PER_MILLISECOND = NPT_HERTZ / 1000

/** The NPT milliseconds come around at, as the NPT itself is thirty-three bits of 90 kHz. */
export const NPT_MILLISECONDS_MODULUS = NPT_MODULUS / TICKS_PER_MILLISECOND

function wrapped(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus
}

/** The stream's NPT, in 90 kHz, at a moment of the frames' clock. */
export function nptAt(reference: NptReference, pts: number): number {
  const elapsed =
    ((pts - reference.stc) * reference.numerator) / reference.denominator

  return wrapped(reference.npt + Math.trunc(elapsed), NPT_MODULUS)
}

/** The stream's NPT as a runtime keeps it, read at a second of the frames' clock. */
export function nptReadingAt(
  reference: NptReference,
  seconds: number,
): NptReading {
  return {
    tag: reference.tag,
    milliseconds: Math.floor(
      nptAt(reference, Math.round(seconds * NPT_HERTZ)) / TICKS_PER_MILLISECOND,
    ),
    rate: reference.numerator / reference.denominator,
  }
}

/** The reading a value carries, or null when its shape is not one. */
export function nptReadingOf(value: unknown): NptReading | null {
  const reading = value as Partial<NptReading> | null

  return typeof reading === 'object' &&
    reading !== null &&
    Number.isInteger(reading.tag) &&
    (reading.tag as number) >= 0 &&
    (reading.tag as number) <= 0xff &&
    Number.isSafeInteger(reading.milliseconds) &&
    (reading.milliseconds as number) >= 0 &&
    typeof reading.rate === 'number' &&
    Number.isFinite(reading.rate) &&
    reading.rate > 0
    ? {
        tag: reading.tag as number,
        milliseconds: reading.milliseconds as number,
        rate: reading.rate,
      }
    : null
}

/** The NPT in whole milliseconds a reading has come to after `elapsedMs` of the clock. */
export function nptMilliseconds(
  reading: NptReading,
  elapsedMs: number,
): number {
  return Math.floor(
    wrapped(
      reading.milliseconds + elapsedMs * reading.rate,
      NPT_MILLISECONDS_MODULUS,
    ),
  )
}
