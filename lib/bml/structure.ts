export type FieldType = 'B' | 'U' | 'I' | 'Z' | 'S' | 'P'

export type FieldUnit = 'B' | 'V'

/** One field of a structure such as `U:8B,S:16V`: its type, its length and whether that length is in bits or names a variable length. */
export interface Field {
  type: FieldType
  length: number
  unit: FieldUnit
}

const FIELD = /^([BUIZSP]):(\d+)([BV])$/

export const MOST_FIELDS = 256

/** The fields a structure string names, or null when it is not one. */
export function fieldsOf(structure: string): Field[] | null {
  if (typeof structure !== 'string') {
    return null
  }

  const parts = structure.split(',').map((part) => FIELD.exec(part.trim()))

  if (
    parts.length === 0 ||
    parts.length > MOST_FIELDS ||
    parts.some((part) => part === null)
  ) {
    return null
  }

  return parts.map((part) => {
    const [, type, length, unit] = part as RegExpExecArray

    return {
      type: type as FieldType,
      length: Number(length),
      unit: unit as FieldUnit,
    }
  })
}

/** The fields that give a column: padding does not. */
export function columnsOf(fields: Field[]): Field[] {
  return fields.filter((field) => field.type !== 'P')
}

/** Whether a value is of a field's kind: text for a string, a number otherwise. */
export function fitsField(field: Field, value: unknown): boolean {
  if (field.type === 'S' || field.type === 'Z') {
    return typeof value === 'string'
  }

  if (field.type === 'B') {
    return typeof value === 'boolean' || typeof value === 'number'
  }

  return typeof value === 'number' && Number.isFinite(value)
}
