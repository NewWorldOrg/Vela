import { BitReader, UTF8, readCells } from '@/lib/bml/fields'
import {
  AREA_BYTES,
  readArray,
  writeArray,
  type PersistentMemory,
} from '@/lib/bml/memory'
import { fieldsOf } from '@/lib/bml/structure'

/** Where the receiver is, as the household registered it in Carina: the postal code as seven digits, and the prefecture as its place in the prefecture designation of ARIB STD-B10 annex G, table G-2, counted from 0. Either is null while it is not registered. */
export interface Residence {
  postalCode: string | null
  prefecture: number | null
}

export const NO_RESIDENCE: Residence = { postalCode: null, prefecture: null }

export const POSTAL_CODE_LENGTH = 7

export const FIRST_PREFECTURE = 0

export const LAST_PREFECTURE = 49

/** The names a document reads the viewer's residence under (ARIB TR-B14, volume 3, 5.2.7). */
export const RECEIVER_INFO = 'nvram://receiverinfo/'

/** What the receiver answers for a prefecture or a region code not registered (TR-B14, volume 3, table 5-2). */
export const NO_PREFECTURE = 255

export const NO_REGION_CODE = 0

/**
 * The region code of the emergency warning signal for each prefecture, in the order of the prefecture designation: the
 * prefecture codes of ARIB STD-B10 annex D, table D-2. The east and the west of Hokkaido share Hokkaido's, and the
 * islands of Tokyo and of Kagoshima share their prefecture's.
 */
export const REGION_CODES: readonly number[] = [
  0x16b, 0x16b, 0x467, 0x5d4, 0x758, 0xac6, 0xe4c, 0x1ae, 0xc69, 0xe38, 0x98b,
  0x64b, 0x1c7, 0xaac, 0x56c, 0x4ce, 0x539, 0x6a6, 0x92d, 0xd4a, 0x9d2, 0xa65,
  0xa5a, 0x966, 0x2dc, 0xce4, 0x59a, 0xcb2, 0x674, 0xa93, 0x396, 0xd23, 0x31b,
  0x2b5, 0xb31, 0xb98, 0xe62, 0x9b4, 0x19d, 0x2e3, 0x62d, 0x959, 0xa2b, 0x8a7,
  0xc8d, 0xd1c, 0xd45, 0x372, 0xaac, 0xd45,
]

export function isPostalCode(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length === POSTAL_CODE_LENGTH &&
    /^[0-9]+$/.test(value)
  )
}

export function isPrefecture(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= FIRST_PREFECTURE &&
    (value as number) <= LAST_PREFECTURE
  )
}

/** A residence from what Carina or the player handed over, or null when it is not one: each value registered as it should be, or null. */
export function residenceOf(value: unknown): Residence | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const { postalCode, prefecture } = value as Record<string, unknown>

  if (
    (postalCode === null || isPostalCode(postalCode)) &&
    (prefecture === null || isPrefecture(prefecture))
  ) {
    return { postalCode, prefecture }
  }

  return null
}

export function isReceiverInfo(name: unknown): name is string {
  return typeof name === 'string' && name.startsWith(RECEIVER_INFO)
}

function block(bytes: readonly number[]): Uint8Array {
  const area = new Uint8Array(AREA_BYTES)

  area.set(bytes)

  return area
}

/** The block a document reads under a name of the residence, as TR-B14 lays it out: the postal code as seven characters, the prefecture in one byte and the region code in two, each read as not registered when it is not. Null for a name the receiver does not have. */
export function receiverInfoBlock(
  residence: Residence,
  name: string,
): Uint8Array | null {
  const { postalCode, prefecture } = residence

  switch (name.slice(RECEIVER_INFO.length)) {
    case 'zipcode':
      return block(Array.from(postalCode ?? '', (digit) => digit.charCodeAt(0)))
    case 'prefecture':
      return block([prefecture ?? NO_PREFECTURE])
    case 'regioncode': {
      const code =
        prefecture === null ? NO_REGION_CODE : REGION_CODES[prefecture]

      return block([code >> 8, code & 0xff])
    }
    default:
      return null
  }
}

/** What a document reads under a name: the residence for a name of the receiver's own, and the broadcaster's memory for any other. Null where the name or the structure is not one the receiver reads. */
export function readPersistent(
  memory: PersistentMemory,
  residence: Residence,
  name: unknown,
  structure: unknown,
): unknown[] | null {
  if (!isReceiverInfo(name)) {
    return readArray(memory, name, structure)
  }

  const read = receiverInfoBlock(residence, name)
  const fields = fieldsOf(structure)

  return read && fields ? readCells(new BitReader(read), fields, UTF8) : null
}

/** Writes values under a name of the broadcaster's memory: how many bytes were written, or null when they do not fit, and for every name of the residence, which a document never writes. */
export function writePersistent(
  memory: PersistentMemory,
  name: unknown,
  structure: unknown,
  data: unknown,
): number | null {
  return isReceiverInfo(name) ? null : writeArray(memory, name, structure, data)
}
