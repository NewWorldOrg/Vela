/** The library laid as a grid of pictures, or as a table. */
export type LibraryLayout = 'grid' | 'table'

/** The library gathered by the day each recording started on, or by series. */
export type LibraryGrouping = 'date' | 'series'

export interface LibraryView {
  by: LibraryGrouping
  as: LibraryLayout
}

/** The view the address asks for, the date grid where it asks for none. */
export function libraryViewOf(
  params: Record<string, string | string[] | undefined>,
): LibraryView {
  return {
    by: params.by === 'series' ? 'series' : 'date',
    as: params.as === 'table' ? 'table' : 'grid',
  }
}
