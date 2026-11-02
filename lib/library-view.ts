/** The library laid as a grid of pictures, or as a table. */
export type LibraryLayout = 'grid' | 'table'

/** The library gathered by the day each recording started on, or by series. */
export type LibraryGrouping = 'date' | 'series'

export interface LibraryView {
  by: LibraryGrouping
  as: LibraryLayout
}

/** The cookie that keeps, on each device, whether the library was last laid as a grid or as a table. */
export const LIBRARY_LAYOUT_COOKIE = 'vela-library-view'

function layoutOf(said: unknown): LibraryLayout | undefined {
  return said === 'grid' || said === 'table' ? said : undefined
}

/** The view the address asks for. A layout the address does not name is the one this device last chose, and the grid on a device that has chosen none. */
export function libraryViewOf(
  params: Record<string, string | string[] | undefined>,
  kept?: string,
): LibraryView {
  return {
    by: params.by === 'series' ? 'series' : 'date',
    as: layoutOf(params.as) ?? layoutOf(kept) ?? 'grid',
  }
}
