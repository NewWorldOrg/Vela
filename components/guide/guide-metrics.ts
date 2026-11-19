import { shapeFor } from '@/lib/not-yet-in-this-build'
import type { Program } from '@/repository/programs'

export const HOUR_REM = 9

export function remOfMinutes(minutes: number): string {
  return `${(minutes / 60) * HOUR_REM}rem`
}

export function hourPxIn(document: Document): number {
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize)

  return HOUR_REM * (rootPx > 0 ? rootPx : 16)
}

type Genre = Program['genre']

const TINT_OF: Record<Genre, string> = {
  news: 'news',
  sports: 'sports',
  info: 'info',
  drama: 'drama',
  music: 'music',
  variety: 'variety',
  movie: 'movie',
  anime: 'anime',
  doc: 'doc',
  other: 'news',
}

export const GENRE_MARK_CLASS: Record<Genre, string> = {
  news: 'bg-g-news-dot',
  sports: 'bg-g-sports-dot',
  info: 'bg-g-info-dot',
  drama: 'bg-g-drama-dot',
  music: 'bg-g-music-dot',
  variety: 'bg-g-variety-dot',
  movie: 'bg-g-movie-dot',
  anime: 'bg-g-anime-dot',
  doc: 'bg-g-doc-dot',
  other: 'bg-g-news-dot',
}

export type CellTime = 'ended' | 'onAir' | 'ahead'

export function cellTimeOf(
  program: Pick<Program, 'startMin' | 'durationMin' | 'endUndecided'>,
  nowMin: number | undefined,
): CellTime {
  if (nowMin === undefined || nowMin < program.startMin) {
    return 'ahead'
  }

  if (
    !program.endUndecided &&
    program.startMin + program.durationMin <= nowMin
  ) {
    return 'ended'
  }

  return 'onAir'
}

export function groundOf(
  genre: Genre,
  time: CellTime,
  splitAt?: string,
): string {
  const tint = shapeFor(TINT_OF, genre, 'news')

  if (time === 'ended') {
    return 'var(--g-neutral)'
  }

  if (time === 'ahead' || splitAt === undefined) {
    return `var(--g-${tint}-deep)`
  }

  return `linear-gradient(to bottom, var(--g-${tint}-light) 0 ${splitAt}, var(--g-${tint}-deep) ${splitAt} 100%)`
}
