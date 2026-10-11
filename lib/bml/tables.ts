import { columnsOf, fieldsOf, type Field } from '@/lib/bml/structure'

export type Cell = number | string | boolean

export const MOST_ROWS = 65536

function decoder(): TextDecoder {
  try {
    return new TextDecoder('euc-jp')
  } catch {
    return new TextDecoder('utf-8')
  }
}

class BitReader {
  private at = 0

  private readonly bytes: Uint8Array

  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }

  get left(): number {
    return this.bytes.length * 8 - this.at
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
    const taken = new Uint8Array(count)

    for (let index = 0; index < count; index += 1) {
      taken[index] = this.bits(8)
    }

    return taken
  }
}

function signed(value: number, bits: number): number {
  return bits > 0 && value >= 2 ** (bits - 1) ? value - 2 ** bits : value
}

function zip(value: number): string {
  return String(value).padStart(7, '0')
}

function readCell(
  reader: BitReader,
  field: Field,
  text: TextDecoder,
): Cell | undefined {
  if (field.type === 'S') {
    if (field.unit === 'V' && reader.left < field.length) {
      return undefined
    }

    const bytes =
      field.unit === 'V'
        ? reader.bits(field.length)
        : Math.floor(field.length / 8)

    return reader.left >= bytes * 8
      ? text.decode(reader.bytesOf(bytes))
      : undefined
  }

  if (reader.left < field.length) {
    return undefined
  }

  const value = reader.bits(field.length)

  switch (field.type) {
    case 'I':
      return signed(value, field.length)
    case 'B':
      return value !== 0
    case 'Z':
      return zip(value)
    default:
      return value
  }
}

/** The rows of a binary table: each field read in turn, bit by bit, until the bytes run out. A row cut short is left out. */
export function binaryRowsOf(bytes: Uint8Array, fields: Field[]): Cell[][] {
  const reader = new BitReader(bytes)
  const text = decoder()
  const rows: Cell[][] = []
  const width = fields.reduce((sum, field) => sum + field.length, 0)

  while (reader.left > 0 && width > 0 && rows.length < MOST_ROWS) {
    const row: Cell[] = []
    let whole = true

    for (const field of fields) {
      const cell = readCell(reader, field, text)

      if (cell === undefined) {
        whole = false
        break
      }

      if (field.type !== 'P') {
        row.push(cell)
      }
    }

    if (!whole) {
      break
    }

    rows.push(row)
  }

  return rows
}

function csvCell(field: Field, text: string): Cell {
  switch (field.type) {
    case 'S':
    case 'Z':
      return text
    case 'B':
      return (
        text.trim() !== '' && text.trim() !== '0' && text.trim() !== 'false'
      )
    default:
      return Number(text.trim())
  }
}

/** The rows of a comma-separated table: one line per row, each cell read as its field says. A line with too few cells is left out. */
export function csvRowsOf(source: string, fields: Field[]): Cell[][] {
  return source
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, MOST_ROWS)
    .flatMap((line) => {
      const cells = line.split(',')

      if (cells.length < fields.length) {
        return []
      }

      return [
        fields.flatMap((field, index) =>
          field.type === 'P' ? [] : [csvCell(field, cells[index])],
        ),
      ]
    })
}

const COMPARE: Record<number, (cell: Cell, compared: Cell) => boolean> = {
  0: (cell, compared) => cell === compared,
  1: (cell, compared) => cell !== compared,
  2: (cell, compared) => cell < compared,
  3: (cell, compared) => cell <= compared,
  4: (cell, compared) => cell > compared,
  5: (cell, compared) => cell >= compared,
  6: (cell, compared) => String(cell).includes(String(compared)),
}

interface Condition {
  column: number
  compared: Cell
  operator: number
  joinedByOr: boolean
}

function conditionsOf(args: unknown[]): Condition[] | null {
  if (args.length % 4 !== 0) {
    return null
  }

  const conditions: Condition[] = []

  for (let at = 0; at < args.length; at += 4) {
    const [column, compared, operator, logic] = args.slice(at, at + 4)

    if (
      typeof column !== 'number' ||
      typeof operator !== 'number' ||
      !(operator in COMPARE) ||
      (typeof compared !== 'number' &&
        typeof compared !== 'string' &&
        typeof compared !== 'boolean')
    ) {
      return null
    }

    conditions.push({ column, compared, operator, joinedByOr: logic === 1 })
  }

  return conditions
}

function joined(
  result: boolean,
  holds: boolean,
  by: 'first' | 'and' | 'or',
): boolean {
  switch (by) {
    case 'first':
      return holds
    case 'and':
      return result && holds
    case 'or':
      return result || holds
  }
}

function matches(row: Cell[], conditions: Condition[]): boolean {
  let result = false
  let by: 'first' | 'and' | 'or' = 'first'

  for (const condition of conditions) {
    const holds = COMPARE[condition.operator](
      row[condition.column],
      condition.compared,
    )

    result = joined(result, holds, by)
    by = condition.joinedByOr ? 'or' : 'and'
  }

  return result
}

/** A table a document reads: rows of cells, each cell by its row and column. */
export class Table {
  readonly nrow: number

  readonly ncolumn: number

  private readonly rows: Cell[][]

  constructor(rows: Cell[][], columns: number) {
    this.rows = rows
    this.nrow = rows.length
    this.ncolumn = columns
  }

  close(): void {}

  private cell(row: unknown, column: unknown): Cell | undefined {
    return typeof row === 'number' && typeof column === 'number'
      ? this.rows[row]?.[column]
      : undefined
  }

  toNumber(row: unknown, column: unknown): number {
    const cell = this.cell(row, column)

    return cell === undefined ? Number.NaN : Number(cell)
  }

  toString(row: unknown, column: unknown): string | null {
    const cell = this.cell(row, column)

    return cell === undefined ? null : String(cell)
  }

  toArray(startRow: unknown, numRow: unknown): Cell[][] | null {
    if (typeof startRow !== 'number' || typeof numRow !== 'number') {
      return null
    }

    const taken = this.rows.slice(startRow, startRow + numRow)

    return taken.length > 0 ? taken.map((row) => [...row]) : null
  }

  /** Searches from a row by conditions of four each (column, compared, operator, logic), then a limit, the columns to give and the array to fill with them. The number of rows found, or -1 when the call is not one. */
  search(startRow: unknown, ...rest: unknown[]): number {
    const [limit, resultColumns, resultArray] = rest.slice(-3)
    const conditions = conditionsOf(rest.slice(0, -3))

    if (
      typeof startRow !== 'number' ||
      !conditions ||
      typeof limit !== 'number' ||
      !Array.isArray(resultColumns) ||
      !Array.isArray(resultArray)
    ) {
      return -1
    }

    const most = limit > 0 ? limit : Number.POSITIVE_INFINITY
    const found = this.rows
      .slice(Math.max(0, startRow))
      .filter((row) => matches(row, conditions))
      .slice(0, most)

    found.forEach((row) =>
      resultArray.push(
        resultColumns.map((column) =>
          typeof column === 'number' ? row[column] : undefined,
        ),
      ),
    )

    return found.length
  }
}

export interface TableSource {
  body: Uint8Array
  text: boolean
}

export type TableLookup = (reference: unknown) => TableSource | null

/** The `BinaryTable` and `CSVTable` constructors a document calls, over the resources the runtime holds. A table that is not there has no rows. */
export function tableClassesOf(lookup: TableLookup) {
  class BinaryTable extends Table {
    constructor(reference: unknown, structure: unknown) {
      const fields =
        typeof structure === 'string' ? (fieldsOf(structure) ?? []) : []
      const source = fields.length > 0 ? lookup(reference) : null

      super(
        source ? binaryRowsOf(source.body, fields) : [],
        columnsOf(fields).length,
      )
    }
  }

  class CSVTable extends Table {
    constructor(reference: unknown, structure: unknown) {
      const fields =
        typeof structure === 'string' ? (fieldsOf(structure) ?? []) : []
      const source = fields.length > 0 ? lookup(reference) : null

      super(
        source ? csvRowsOf(decoder().decode(source.body), fields) : [],
        columnsOf(fields).length,
      )
    }
  }

  return { BinaryTable, CSVTable }
}
