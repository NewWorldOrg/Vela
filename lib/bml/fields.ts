import { bitsOf, type Field } from '@/lib/bml/structure'
import { zipCodeOf, type ZipCode } from '@/lib/bml/zipcode'

/** What one field holds once read: a number, text, a truth or a zip code. */
export type Cell = number | string | boolean | ZipCode

/** How text in a block of fields is read and written. */
export interface TextCoding {
  decode(bytes: Uint8Array): string
  encode(text: string): Uint8Array
}

const utf8Decoder = new TextDecoder('utf-8')

const utf8Encoder = new TextEncoder()

/** Text as UTF-8, which is how the runtime keeps its own blocks. */
export const UTF8: TextCoding = {
  decode: (bytes) => utf8Decoder.decode(bytes),
  encode: (text) => utf8Encoder.encode(text),
}

function eucDecoder(): TextDecoder {
  try {
    return new TextDecoder('euc-jp')
  } catch {
    return utf8Decoder
  }
}

/** Text as a broadcast writes it into its tables, EUC-JP, read only. */
export const BROADCAST_TEXT: TextCoding = {
  decode: (bytes) => eucDecoder().decode(bytes),
  encode: (text) => utf8Encoder.encode(text),
}

/** Text up to its first NUL, as a fixed field is read. */
function untilNul(text: string): string {
  const at = text.indexOf('\0')

  return at < 0 ? text : text.slice(0, at)
}

export class BitReader {
  private at = 0

  private readonly bytes: Uint8Array

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }

  get left(): number {
    return this.bytes.length * 8 - this.at
  }

  /** The bytes read so far, a byte begun counted whole. */
  get bytesTaken(): number {
    return Math.ceil(this.at / 8)
  }

  align(): void {
    this.at = this.bytesTaken * 8
  }

  bits(count: number): number {
    let value = 0

    for (let read = 0; read < count; read += 1) {
      const byte = this.bytes[this.at >> 3]
      const bit = (byte >> (7 - (this.at & 7))) & 1

      value = value * 2 + bit
      this.at += 1
    }

    return value
  }

  bytesOf(count: number): Uint8Array {
    this.align()

    const from = this.at >> 3
    const taken = this.bytes.slice(from, from + count)

    this.at += count * 8

    return taken
  }
}

function signed(value: number, bits: number): number {
  return value >= 2 ** (bits - 1) ? value - 2 ** bits : value
}

function textCell(
  reader: BitReader,
  field: Field,
  text: TextCoding,
): string | undefined {
  reader.align()

  if (field.unit === 'B') {
    return reader.left >= field.length * 8
      ? untilNul(text.decode(reader.bytesOf(field.length)))
      : undefined
  }

  if (reader.left < field.length * 8) {
    return undefined
  }

  const length = reader.bits(field.length * 8)

  return reader.left >= length * 8
    ? text.decode(reader.bytesOf(length))
    : undefined
}

function zipCell(reader: BitReader, field: Field): ZipCode | undefined {
  reader.align()

  if (reader.left < field.length * 8) {
    return undefined
  }

  const length = reader.bits(field.length * 8)

  return reader.left >= length * 8
    ? zipCodeOf(reader.bytesOf(length))
    : undefined
}

/** Reads one field, or nothing when the bytes run out before it ends. */
export function readCell(
  reader: BitReader,
  field: Field,
  text: TextCoding,
): Cell | undefined {
  if (field.type === 'S') {
    return textCell(reader, field, text)
  }

  if (field.type === 'Z') {
    return zipCell(reader, field)
  }

  if (field.type === 'I') {
    reader.align()
  }

  const bits = bitsOf(field)

  if (reader.left < bits) {
    return undefined
  }

  const value = reader.bits(bits)

  switch (field.type) {
    case 'I':
      return signed(value, bits)
    case 'B':
      return value !== 0
    default:
      return value
  }
}

/** Reads the fields of one block in turn; padding gives no cell. Null when the block ends before the fields do. */
export function readCells(
  reader: BitReader,
  fields: Field[],
  text: TextCoding,
): Cell[] | null {
  const cells: Cell[] = []

  for (const field of fields) {
    const cell = readCell(reader, field, text)

    if (cell === undefined) {
      return null
    }

    if (field.type !== 'P') {
      cells.push(cell)
    }
  }

  return cells
}

class BitWriter {
  private readonly bits: number[] = []

  put(value: number, count: number): void {
    for (let bit = count - 1; bit >= 0; bit -= 1) {
      this.bits.push(Math.floor(value / 2 ** bit) % 2)
    }
  }

  align(): void {
    while (this.bits.length % 8 !== 0) {
      this.bits.push(0)
    }
  }

  putBytes(bytes: Uint8Array): void {
    this.align()
    bytes.forEach((byte) => this.put(byte, 8))
  }

  get bytes(): Uint8Array {
    this.align()

    const out = new Uint8Array(this.bits.length / 8)

    this.bits.forEach((bit, index) => {
      out[index >> 3] |= bit << (7 - (index & 7))
    })

    return out
  }
}

/** A value as the bits of a field hold it: whole, wrapped to the width, and zero when it is not a number. */
function wrapped(value: unknown, bits: number): number {
  const whole = Math.trunc(Number(value))
  const width = 2 ** bits

  return Number.isFinite(whole) ? ((whole % width) + width) % width : 0
}

function writeText(
  writer: BitWriter,
  field: Field,
  value: unknown,
  text: TextCoding,
): boolean {
  const encoded = text.encode(String(value))

  if (field.unit === 'B') {
    const fixed = new Uint8Array(field.length)

    fixed.set(encoded.subarray(0, field.length))
    writer.putBytes(fixed)

    return true
  }

  if (encoded.length >= 2 ** (field.length * 8)) {
    return false
  }

  writer.align()
  writer.put(encoded.length, field.length * 8)
  writer.putBytes(encoded)

  return true
}

function writeCell(
  writer: BitWriter,
  field: Field,
  value: unknown,
  text: TextCoding,
): boolean {
  switch (field.type) {
    case 'S':
    case 'Z':
      return writeText(writer, field, value, text)
    case 'P':
      writer.put(0, bitsOf(field))
      return true
    case 'I':
      writer.align()
      writer.put(wrapped(value, bitsOf(field)), bitsOf(field))
      return true
    default:
      writer.put(wrapped(value, bitsOf(field)), bitsOf(field))
      return true
  }
}

/** Writes values into a block as its fields say, one value per field that gives a cell. Null when a value does not fit its field. */
export function writeCells(
  fields: Field[],
  values: unknown[],
  text: TextCoding,
): Uint8Array | null {
  const writer = new BitWriter()
  let next = 0

  for (const field of fields) {
    const value = field.type === 'P' ? 0 : values[next]

    next += field.type === 'P' ? 0 : 1

    if (!writeCell(writer, field, value, text)) {
      return null
    }
  }

  return writer.bytes
}
