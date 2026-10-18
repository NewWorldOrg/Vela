export type FieldType = 'B' | 'U' | 'I' | 'Z' | 'S' | 'P'

/** The unit of a field's length: `B` bytes, `b` bits, `V` the bytes of the length that comes before a value of varying length. */
export type FieldUnit = 'B' | 'b' | 'V'

/** One field of a structure such as `U:2B,U:4b,S:1V`: its type, its length and the unit of that length. */
export interface Field {
  type: FieldType
  length: number
  unit: FieldUnit
}

/** The structure of a binary table: the bytes of the length each row begins with, if any, and its fields. */
export interface TableStructure {
  rowLength: number
  fields: Field[]
}

const FIELD = /^([BUIZSP]):(\d+)([BbV])$/

const COUNT = /^\d+$/

export const MOST_FIELDS = 256

export const MOST_INTEGER_BITS = 32

export const MOST_ROW_LENGTH_BYTES = 4

const SIGNED_BYTES = new Set([1, 2, 4])

/** The bits a field of fixed width takes, or the bits of the length before a value of varying length. */
export function bitsOf(field: Field): number {
  return field.unit === 'b' ? field.length : field.length * 8
}

function isField(field: Field): boolean {
  if (field.length < 1) {
    return false
  }

  switch (field.type) {
    case 'U':
      return field.unit !== 'V' && bitsOf(field) <= MOST_INTEGER_BITS
    case 'I':
      return field.unit === 'B' && SIGNED_BYTES.has(field.length)
    case 'B':
      return field.unit !== 'V' && bitsOf(field) <= MOST_INTEGER_BITS
    case 'S':
      return (
        field.unit === 'B' ||
        (field.unit === 'V' && field.length <= MOST_ROW_LENGTH_BYTES)
      )
    case 'Z':
      return field.unit === 'V' && field.length <= MOST_ROW_LENGTH_BYTES
    case 'P':
      return field.unit !== 'V'
  }
}

function fieldOf(part: string): Field | null {
  const found = FIELD.exec(part.trim())

  if (!found) {
    return null
  }

  const field: Field = {
    type: found[1] as FieldType,
    length: Number(found[2]),
    unit: found[3] as FieldUnit,
  }

  return isField(field) ? field : null
}

/** The fields a structure names, or null when it is not one. */
export function fieldsOf(structure: unknown): Field[] | null {
  if (typeof structure !== 'string') {
    return null
  }

  const fields = structure.split(',').map(fieldOf)

  return fields.length > 0 &&
    fields.length <= MOST_FIELDS &&
    fields.every((field) => field !== null)
    ? (fields as Field[])
    : null
}

/** The structure of a binary table, whose first part is the bytes of the length each row begins with: `1,S:1V` or `0,U:2B,U:4b`. A structure without it has rows of no length before them. */
export function tableStructureOf(structure: unknown): TableStructure | null {
  if (typeof structure !== 'string') {
    return null
  }

  const at = structure.indexOf(',')
  const head = at < 0 ? structure : structure.slice(0, at)
  const counted = COUNT.test(head.trim())
  const rowLength = counted ? Number(head) : 0
  const fields = fieldsOf(counted ? structure.slice(at + 1) : structure)

  return fields && rowLength <= MOST_ROW_LENGTH_BYTES
    ? { rowLength, fields }
    : null
}

/** The fields that give a column: padding does not. */
export function columnsOf(fields: Field[]): Field[] {
  return fields.filter((field) => field.type !== 'P')
}

/** Whether a value is of a field's kind: text for a string or a zip code, a number otherwise. */
export function fitsField(field: Field, value: unknown): boolean {
  if (field.type === 'S' || field.type === 'Z') {
    return typeof value === 'string'
  }

  if (field.type === 'B') {
    return typeof value === 'boolean' || typeof value === 'number'
  }

  return typeof value === 'number' && Number.isFinite(value)
}
