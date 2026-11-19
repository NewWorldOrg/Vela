export interface NptReference {
  tag: number
  stc: number
  npt: number
  numerator: number
  denominator: number
}

export interface NptReading {
  tag: number
  milliseconds: number
  rate: number
}

export const NPT_HERTZ = 90_000

export const NPT_MODULUS = 2 ** 33

const TICKS_PER_MILLISECOND = NPT_HERTZ / 1000

export const NPT_MILLISECONDS_MODULUS = NPT_MODULUS / TICKS_PER_MILLISECOND

function wrapped(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus
}

export function nptAt(reference: NptReference, pts: number): number {
  const elapsed =
    ((pts - reference.stc) * reference.numerator) / reference.denominator

  return wrapped(reference.npt + Math.trunc(elapsed), NPT_MODULUS)
}

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
