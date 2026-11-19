export type FieldType = 'B' | 'U' | 'I' | 'Z' | 'S' | 'P'

export type FieldUnit = 'B' | 'b' | 'V'

export interface Field {
  type: FieldType
  length: number
  unit: FieldUnit
}

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

export function columnsOf(fields: Field[]): Field[] {
  return fields.filter((field) => field.type !== 'P')
}

export function fitsField(field: Field, value: unknown): boolean {
  if (field.type === 'S' || field.type === 'Z') {
    return typeof value === 'string'
  }

  if (field.type === 'B') {
    return typeof value === 'boolean' || typeof value === 'number'
  }

  return typeof value === 'number' && Number.isFinite(value)
}
