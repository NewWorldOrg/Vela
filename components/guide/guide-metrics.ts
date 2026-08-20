import type { Program } from '@/repository/programs'

/** One hour of the guide window is 96px tall. */
export const HOUR_PX = 96

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

/**
 * A programme that has already ended keeps the same faded tile, but the fade is
 * carried by the fill and the hairline instead of the element. Fading the whole
 * element takes the label down with it, and the label then falls below AA.
 */
export const GENRE_CLASS_PAST: Record<Program['genre'], string> = {
  news: 'bg-genre-news/52 border-genre-news-line/52',
  sports: 'bg-genre-sports/52 border-genre-sports-line/52',
  info: 'bg-genre-info/52 border-genre-info-line/52',
  drama: 'bg-genre-drama/52 border-genre-drama-line/52',
  music: 'bg-genre-music/52 border-genre-music-line/52',
  variety: 'bg-genre-variety/52 border-genre-variety-line/52',
  movie: 'bg-genre-movie/52 border-genre-movie-line/52',
  anime: 'bg-genre-anime/52 border-genre-anime-line/52',
  doc: 'bg-genre-doc/52 border-genre-doc-line/52',
  other: 'bg-genre-other/52 border-genre-other-line/52',
}
