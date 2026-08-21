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
 * A programme that has already ended leaves the tint and comes down onto the
 * plain second surface, the same face a finished row is given elsewhere.
 *
 * Thinning the tint instead — whether by fading the element or, as before, by
 * fading only the fill and the hairline — is a move towards the ground, and in
 * the light theme the ground is where the tints already are: a pastel is 5.5
 * to 9.5 dE from it, so half of one is 2.6 to 4.6 dE from the tint it came
 * from, which is at the edge of being a difference at all. The dark theme sits
 * twice as far out, which is why the same fade reads there and not here. A
 * face is not a weaker tint but a different kind of thing, so it separates by
 * the same amount in both themes.
 *
 * The genre keeps its hairline at full strength, and the genre is written on
 * the cell in words besides.
 *
 * The hairline turns dashed. A cell whose genre is `other`, and any cell in a
 * sub-service column, is already drawn on that second surface while it is
 * live, so the face alone cannot say it has ended; and a guide that says so
 * only in colour says it to fewer people than one that says it in a line as
 * well.
 */
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
