/** A run of seven-digit postal codes, both ends in. */
export interface ZipRange {
  from: number
  to: number
}

/** The postal codes a zip code field names: those in its included runs and in none of its excluded runs. */
export interface ZipCode {
  includes: ZipRange[]
  excludes: ZipRange[]
}

export const MOST_ZIP = 9_999_999

const UNUSED = 0xf

const LONG_FORM = 0x80

const SHORT_FORM_BYTES = 4

const LONG_FORM_BYTES = 4

const DIGIT_PREFIXES = {
  twoDigits: 100_000,
  threeDigits: 10_000,
  fiveDigits: 100,
} as const

interface Entry {
  kind: number
  prefix: number
  digits: number[]
}

function digit(value: number): number | null {
  return value <= 9 ? value : null
}

function shortForm(bytes: Uint8Array, at: number, into: ZipRange[]): void {
  const pairs = [
    [bytes[at], bytes[at + 1]],
    [bytes[at + 2], bytes[at + 3]],
  ]

  pairs.forEach(([start, end], index) => {
    if (index === 1 && (start & LONG_FORM) === 0) {
      return
    }

    const from = (start & 0x7f) * DIGIT_PREFIXES.twoDigits
    const to = ((end & 0x7f) + 1) * DIGIT_PREFIXES.twoDigits - 1

    into.push({ from, to })
  })
}

function entryOf(bytes: Uint8Array, at: number): Entry {
  return {
    kind: bytes[at + 1] >> 4,
    prefix: bytes[at] & 0x7f,
    digits: [
      bytes[at + 1] & UNUSED,
      bytes[at + 2] >> 4,
      bytes[at + 2] & UNUSED,
      bytes[at + 3] >> 4,
      bytes[at + 3] & UNUSED,
    ],
  }
}

function threeDigitList(entry: Entry, into: ZipRange[]): void {
  entry.digits.forEach((nibble) => {
    const third = digit(nibble)

    if (third !== null) {
      const prefix = entry.prefix * 10 + third

      into.push({
        from: prefix * DIGIT_PREFIXES.threeDigits,
        to: (prefix + 1) * DIGIT_PREFIXES.threeDigits - 1,
      })
    }
  })
}

function threeDigitRanges(entry: Entry, into: ZipRange[]): void {
  const [, b, c, d, e] = entry.digits
  const pairs = [
    [digit(b), digit(c)],
    [digit(d), digit(e)],
  ]

  pairs.forEach(([start, end]) => {
    if (start !== null && end !== null) {
      into.push({
        from: (entry.prefix * 10 + start) * DIGIT_PREFIXES.threeDigits,
        to: (entry.prefix * 10 + end + 1) * DIGIT_PREFIXES.threeDigits - 1,
      })
    }
  })
}

function fiveDigitPrefix(entry: Entry, nibbles: number[]): number | null {
  const digits = nibbles.map(digit)

  return digits.every((each) => each !== null)
    ? (digits as number[]).reduce((sum, each) => sum * 10 + each, entry.prefix)
    : null
}

function fiveDigitList(entry: Entry, into: ZipRange[]): void {
  const [a, b, c, d, e] = entry.digits
  const prefixes = [
    fiveDigitPrefix(entry, [a, b, c]),
    fiveDigitPrefix(entry, [a, d, e]),
  ]

  prefixes.forEach((prefix) => {
    if (prefix !== null) {
      into.push({
        from: prefix * DIGIT_PREFIXES.fiveDigits,
        to: (prefix + 1) * DIGIT_PREFIXES.fiveDigits - 1,
      })
    }
  })
}

function sevenDigits(entry: Entry): number | null {
  const digits = entry.digits.map(digit)

  return digits.every((each) => each !== null)
    ? (digits as number[]).reduce((sum, each) => sum * 10 + each, entry.prefix)
    : null
}

/** The runs a list of entries names. A run that starts with one entry and ends with the next is read as one. */
function rangesOf(bytes: Uint8Array): ZipRange[] {
  const ranges: ZipRange[] = []
  let at = 0

  while (at + SHORT_FORM_BYTES <= bytes.length) {
    if ((bytes[at] & LONG_FORM) === 0) {
      shortForm(bytes, at, ranges)
      at += SHORT_FORM_BYTES
      continue
    }

    const entry = entryOf(bytes, at)
    const next =
      at + LONG_FORM_BYTES * 2 <= bytes.length
        ? entryOf(bytes, at + LONG_FORM_BYTES)
        : null

    at += LONG_FORM_BYTES
    at += longForm(entry, next, ranges) ? LONG_FORM_BYTES : 0
  }

  return ranges
}

/** Reads one long entry into the runs; true when it took the entry after it as its end. */
function longForm(entry: Entry, next: Entry | null, into: ZipRange[]): boolean {
  switch (entry.kind) {
    case 0x8:
      threeDigitList(entry, into)
      return false
    case 0x9:
      threeDigitRanges(entry, into)
      return false
    case 0xa:
      fiveDigitList(entry, into)
      return false
    case 0xb:
      return fiveDigitRun(entry, next, into)
    case 0xd:
    case 0xf:
      return sevenDigitRun(entry, next, into)
    default:
      return false
  }
}

function fiveDigitRun(
  entry: Entry,
  next: Entry | null,
  into: ZipRange[],
): boolean {
  const [a, b, c] = entry.digits
  const from = fiveDigitPrefix(entry, [a, b, c])
  const to =
    next && next.kind === 0xc
      ? fiveDigitPrefix(next, next.digits.slice(0, 3))
      : null

  if (from !== null && to !== null) {
    into.push({
      from: from * DIGIT_PREFIXES.fiveDigits,
      to: (to + 1) * DIGIT_PREFIXES.fiveDigits - 1,
    })
  }

  return to !== null
}

function sevenDigitRun(
  entry: Entry,
  next: Entry | null,
  into: ZipRange[],
): boolean {
  const from = sevenDigits(entry)
  const to = next && next.kind === 0xe ? sevenDigits(next) : null

  if (from !== null) {
    into.push({ from, to: to ?? from })
  }

  return to !== null
}

/** The zip code a `Z` field holds: its length, the length of its excluded list, that list, then the included list. */
export function zipCodeOf(bytes: Uint8Array): ZipCode {
  if (bytes.length < 2) {
    return { includes: [], excludes: [] }
  }

  const total = Math.min(bytes[0], bytes.length - 1)
  const excluded = Math.min(bytes[1], Math.max(0, total - 1))
  const excludes = bytes.subarray(2, 2 + excluded)
  const includes = bytes.subarray(2 + excluded, 1 + total)

  return { includes: rangesOf(includes), excludes: rangesOf(excludes) }
}

function within(ranges: ZipRange[], code: number): boolean {
  return ranges.some((range) => code >= range.from && code <= range.to)
}

/** Whether a seven-digit postal code is one the field names. */
export function zipIncludes(zip: ZipCode, code: unknown): boolean {
  const asked = Number(code)

  return (
    Number.isInteger(asked) &&
    asked >= 0 &&
    asked <= MOST_ZIP &&
    within(zip.includes, asked) &&
    !within(zip.excludes, asked)
  )
}

export function isZipCode(value: unknown): value is ZipCode {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as ZipCode).includes) &&
    Array.isArray((value as ZipCode).excludes)
  )
}
