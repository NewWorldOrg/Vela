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
}
