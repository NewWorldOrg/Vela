export type LibraryLayout = 'grid' | 'table'

export type LibraryGrouping = 'date' | 'series'

export interface LibraryView {
  by: LibraryGrouping
  as: LibraryLayout
}

export const LIBRARY_LAYOUT_COOKIE = 'vela-library-view'

function layoutOf(said: unknown): LibraryLayout | undefined {
  return said === 'grid' || said === 'table' ? said : undefined
}

export function libraryViewOf(
  params: Record<string, string | string[] | undefined>,
  kept?: string,
): LibraryView {
  return {
    by: params.by === 'series' ? 'series' : 'date',
    as: layoutOf(params.as) ?? layoutOf(kept) ?? 'grid',
  }
}
