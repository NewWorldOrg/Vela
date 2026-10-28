/** Rows laid out field by field, so a page that hands a client hundreds of rows names each field once. A field a row leaves out is held as `null`. */
export interface PackedRows<T extends object> {
  count: number
  fields: { [K in keyof T]?: Array<T[K] | null> }
}

export function packedRowsOf<T extends object>(
  rows: readonly T[],
): PackedRows<T> {
  const fields: Partial<Record<keyof T, Array<T[keyof T] | null>>> = {}

  rows.forEach((row, nth) => {
    for (const key of Object.keys(row) as (keyof T)[]) {
      const column = (fields[key] ??= Array.from(
        { length: rows.length },
        () => null,
      ))

      column[nth] = row[key] ?? null
    }
  })

  return { count: rows.length, fields } as PackedRows<T>
}

export function rowsOf<T extends object>(packed: PackedRows<T>): T[] {
  const columns = Object.entries(packed.fields) as [string, unknown[]][]

  return Array.from({ length: packed.count }, (_, nth) => {
    const row: Record<string, unknown> = {}

    for (const [key, column] of columns) {
      if (column[nth] !== null) {
        row[key] = column[nth]
      }
    }

    return row as T
  })
}
