import type { Program } from '@/repository/programs'

export const HOUR_REM = 9

/** A length of the guide's time axis, in rem so the hours grow with the words. */
export function remOfMinutes(minutes: number): string {
  return `${(minutes / 60) * HOUR_REM}rem`
}

/** How tall an hour is drawn in this document, in pixels. */
export function hourPxIn(document: Document): number {
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize)

  return HOUR_REM * (rootPx > 0 ? rootPx : 16)
}

export const GENRE_CLASS: Record<Program['genre'], string> = {
  news: 'bg-genre-news border-genre-news-line',
  sports: 'bg-genre-sports border-genre-sports-line',
  info: 'bg-genre-info border-genre-info-line',
  drama: 'bg-genre-drama border-genre-drama-line',
  music: 'bg-genre-music border-genre-music-line',
  variety: 'bg-genre-variety border-genre-variety-line',
  movie: 'bg-genre-movie border-genre-movie-line',
  anime: 'bg-genre-anime border-genre-anime-line',
  doc: 'bg-genre-doc border-genre-doc-line',
  other: 'bg-genre-other border-genre-other-line',
}

export const GENRE_CLASS_PAST: Record<Program['genre'], string> = {
  news: 'border-dashed bg-surface-2 border-genre-news-line',
  sports: 'border-dashed bg-surface-2 border-genre-sports-line',
  info: 'border-dashed bg-surface-2 border-genre-info-line',
  drama: 'border-dashed bg-surface-2 border-genre-drama-line',
  music: 'border-dashed bg-surface-2 border-genre-music-line',
  variety: 'border-dashed bg-surface-2 border-genre-variety-line',
  movie: 'border-dashed bg-surface-2 border-genre-movie-line',
  anime: 'border-dashed bg-surface-2 border-genre-anime-line',
  doc: 'border-dashed bg-surface-2 border-genre-doc-line',
  other: 'border-dashed bg-surface-2 border-genre-other-line',
}
