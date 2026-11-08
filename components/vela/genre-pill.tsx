import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import type { Genre } from '@/repository/programs'
import { Badge } from '@/components/ui/badge'

/** The pill that names a programme's genre as a fact: the genre's light tint under its deep text, and neutral where the genre has no colour of its own. */
const GENRE_PILL_CLASS: Partial<Record<Genre, string>> = {
  news: 'bg-g-news-light text-g-news-text',
  sports: 'bg-g-sports-light text-g-sports-text',
  info: 'bg-g-info-light text-g-info-text',
  drama: 'bg-g-drama-light text-g-drama-text',
  music: 'bg-g-music-light text-g-music-text',
  variety: 'bg-g-variety-light text-g-variety-text',
  movie: 'bg-g-movie-light text-g-movie-text',
  anime: 'bg-g-anime-light text-g-anime-text',
  doc: 'bg-g-doc-light text-g-doc-text',
}

export function GenrePill({
  genre,
  className,
  ...props
}: ComponentProps<'span'> & { genre?: Genre }) {
  return (
    <Badge
      variant="mute"
      data-genre={genre}
      className={cn(genre && GENRE_PILL_CLASS[genre], className)}
      {...props}
    />
  )
}
