import {
  BROADCAST_TEXT,
  BitReader,
  readCells,
  type Cell,
} from '@/lib/bml/fields'
import {
  columnsOf,
  fieldsOf,
  tableStructureOf,
  type Field,
  type TableStructure,
} from '@/lib/bml/structure'
import { isZipCode, zipIncludes } from '@/lib/bml/zipcode'

export type { Cell } from '@/lib/bml/fields'

export const MOST_ROWS = 65536

/** The rows of a binary table: each row begins with its length when the structure says so, and its fields are read in turn. A row cut short is left out, and so is everything after it. */
export function binaryRowsOf(
  bytes: Uint8Array,
  structure: TableStructure,
): Cell[][] {
  const rows: Cell[][] = []
  let at = 0

  while (at < bytes.length && rows.length < MOST_ROWS) {
    const head = structure.rowLength
    const length =
      head > 0 && at + head <= bytes.length
        ? new BitReader(bytes.subarray(at, at + head)).bits(head * 8)
        : null

    if (head > 0 && length === null) {
      break
    }

    const from = at + head
    const block =
      length === null
        ? bytes.subarray(from)
        : bytes.subarray(from, from + length)
    const reader = new BitReader(block)
    const row = readCells(reader, structure.fields, BROADCAST_TEXT)

    if (!row) {
      break
    }

    rows.push(row)
    at = from + (length ?? reader.bytesTaken)
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

type Compare = (cell: Cell, compared: unknown) => boolean

function masked(value: number, field: Field): number {
  const bits = field.unit === 'b' ? field.length : field.length * 8

  return bits >= 32 ? value >>> 0 : value & (2 ** bits - 1)
}

/** How numbers are compared by value. */
const NUMERIC: Record<number, (cell: number, compared: number) => boolean> = {
  0: (cell, compared) => cell === compared,
  1: (cell, compared) => cell !== compared,
  2: (cell, compared) => cell < compared,
  3: (cell, compared) => cell <= compared,
  4: (cell, compared) => cell > compared,
  5: (cell, compared) => cell >= compared,
}

/** How numbers are compared bit by bit: the condition holds when a bit of the result is set within the width of the field. */
const BITWISE: Record<number, (cell: number, compared: number) => number> = {
  6: (cell, compared) => cell & compared,
  7: (cell, compared) => cell | compared,
  8: (cell, compared) => cell ^ compared,
  9: (cell, compared) => ~(cell & compared),
  10: (cell, compared) => ~(cell | compared),
  11: (cell, compared) => ~(cell ^ compared),
}

/** How text is compared: whole, by a part, by its start or its end, and the two denials. */
const TEXT: Record<number, (cell: string, compared: string) => boolean> = {
  32: (cell, compared) => cell === compared,
  33: (cell, compared) => cell.includes(compared),
  34: (cell, compared) => cell.startsWith(compared),
  35: (cell, compared) => cell.endsWith(compared),
  36: (cell, compared) => cell !== compared,
  37: (cell, compared) => !cell.includes(compared),
}

const TRUTH: Record<number, (cell: boolean, compared: boolean) => boolean> = {
  64: (cell, compared) => cell === compared,
  65: (cell, compared) => cell !== compared,
}

const ZIP: Record<number, boolean> = { 96: true, 97: false }

function numericCompare(operator: number, field: Field): Compare | null {
  const byValue = NUMERIC[operator]
  const byBits = BITWISE[operator]

  if (byValue) {
    return (cell, compared) => byValue(Number(cell), Number(compared))
  }

  return byBits
    ? (cell, compared) =>
        masked(byBits(Number(cell), Number(compared)), field) !== 0
    : null
}

/** The comparison an operator names for a column, or null when the operator is not one for that column's kind. */
function compareOf(operator: number, field: Field): Compare | null {
  switch (field.type) {
    case 'U':
    case 'I':
      return numericCompare(operator, field)
    case 'S':
      return TEXT[operator]
        ? (cell, compared) => TEXT[operator](String(cell), String(compared))
        : null
    case 'B':
      return TRUTH[operator]
        ? (cell, compared) => TRUTH[operator](Boolean(cell), Boolean(compared))
        : null
    case 'Z':
      return operator in ZIP
        ? (cell, compared) =>
            isZipCode(cell) && zipIncludes(cell, compared) === ZIP[operator]
        : null
    default:
      return null
  }
}

interface Condition {
  column: number
  compared: unknown
  compare: Compare
}

interface Search {
  startRow: number
  conditions: Condition[]
  anyOf: boolean
  limit: number
  into: unknown[]
}

const CONDITION_ARGS = 3

const TAIL_ARGS = 3

function searchOf(columns: Field[], args: unknown[]): Search | null {
  const [startRow, ...rest] = args
  const count = (rest.length - TAIL_ARGS) / CONDITION_ARGS
  const [anyOf, limit, into] = rest.slice(-TAIL_ARGS)

  if (
    !Number.isInteger(startRow) ||
    (startRow as number) < 0 ||
    !Number.isInteger(count) ||
    count < 1 ||
    !Number.isInteger(limit) ||
    (limit as number) < 1 ||
    !Array.isArray(into)
  ) {
    return null
  }

  const conditions: Condition[] = []

  for (let at = 0; at < count * CONDITION_ARGS; at += CONDITION_ARGS) {
    const [column, compared, operator] = rest.slice(at, at + CONDITION_ARGS)
    const field = typeof column === 'number' ? columns[column] : undefined
    const compare =
      field && typeof operator === 'number' ? compareOf(operator, field) : null

    if (!compare) {
      return null
    }

    conditions.push({ column: column as number, compared, compare })
  }

  return {
    startRow: startRow as number,
    conditions,
    anyOf: Boolean(anyOf),
    limit: limit as number,
    into,
  }
}

function holds(row: Cell[], condition: Condition): boolean {
  return condition.compare(row[condition.column], condition.compared)
}

function matches(row: Cell[], search: Search): boolean {
  return search.anyOf
    ? search.conditions.some((condition) => holds(row, condition))
    : search.conditions.every((condition) => holds(row, condition))
}

/** A row as a search gives it back: a zip code column becomes whether the row's conditions on it held, and false where there was none. */
function found(row: Cell[], search: Search): unknown[] {
  return row.map((cell, column) => {
    if (!isZipCode(cell)) {
      return cell
    }

    const on = search.conditions.filter(
      (condition) => condition.column === column,
    )
    const held = on.filter((condition) => holds(row, condition)).length

    return held > 0 && (search.anyOf || held === on.length)
  })
}

function plain(cell: Cell | undefined): number | string | boolean | undefined {
  return isZipCode(cell) ? undefined : cell
}

/** A table a document reads: rows of cells, each cell by its row and column. */
export class Table {
  readonly nrow: number

  readonly ncolumn: number

  private readonly rows: Cell[][]

  private readonly columns: Field[]

  constructor(rows: Cell[][], columns: Field[]) {
    this.rows = rows
    this.columns = columns
    this.nrow = rows.length
    this.ncolumn = columns.length
  }

  close(): void {}

  private cell(row: unknown, column: unknown): Cell | undefined {
    return typeof row === 'number' && typeof column === 'number'
      ? this.rows[row]?.[column]
      : undefined
  }

  toNumber(row: unknown, column: unknown): number {
    const cell = plain(this.cell(row, column))

    return cell === undefined ? Number.NaN : Number(cell)
  }

  toString(row: unknown, column: unknown): string | null {
    const cell = plain(this.cell(row, column))

    return cell === undefined ? null : String(cell)
  }

  /** The rows from one for as many as asked, as far as the table goes; a zip code is given as null. */
  toArray(startRow: unknown, numRow: unknown): unknown[][] | null {
    if (
      !Number.isInteger(startRow) ||
      !Number.isInteger(numRow) ||
      (startRow as number) < 0 ||
      (numRow as number) < 0
    ) {
      return null
    }

    const from = startRow as number

    return this.rows
      .slice(from, from + (numRow as number))
      .map((row) => row.map((cell) => plain(cell) ?? null))
  }

  /** Searches from a row by conditions of three each (column, compared, operator), then whether any one condition is enough, how many rows to find and the array to fill with them. The row at which the count was reached, -1 when the table ended first, or NaN when the call is not one. */
  search(...args: unknown[]): number {
    const search = searchOf(this.columns, args)

    if (!search) {
      return Number.NaN
    }

    search.into.length = 0

    for (let at = search.startRow; at < this.rows.length; at += 1) {
      if (!matches(this.rows[at], search)) {
        continue
      }

      search.into.push(found(this.rows[at], search))

      if (search.into.length >= search.limit) {
        return at
      }
    }

    return -1
  }
}

export interface TableSource {
  body: Uint8Array
  text: boolean
}

export type TableLookup = (reference: unknown) => TableSource | null

/** The `BinaryTable` and `CSVTable` a document makes, over the resources the runtime holds: a table that is not there, or a structure that is not one, is null, as a receiver answers when it cannot generate one. A script writes `new` before them, which the runtime takes away before running it, as `new` cannot answer null. */
export function tableClassesOf(lookup: TableLookup) {
  const BinaryTable = (
    reference: unknown,
    structure: unknown,
  ): Table | null => {
    const read = tableStructureOf(structure)
    const source = read ? lookup(reference) : null

    return read && source
      ? new Table(binaryRowsOf(source.body, read), columnsOf(read.fields))
      : null
  }

  const CSVTable = (reference: unknown, structure: unknown): Table | null => {
    const fields = fieldsOf(structure) ?? []
    const source = fields.length > 0 ? lookup(reference) : null

    return source
      ? new Table(
          csvRowsOf(BROADCAST_TEXT.decode(source.body), fields),
          columnsOf(fields),
        )
      : null
  }

  return { BinaryTable, CSVTable }
}
