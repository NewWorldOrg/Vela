import { cn } from '@/lib/utils'
import type { Genre } from '@/repository/programs'
import { GENRE_MARK_CLASS } from '@/components/guide/guide-metrics'

/** The 7px dot of a programme's genre, in the guide's colour for it; nothing where the genre is not known. */
export function GenreDot({
  genre,
  className,
}: {
  genre?: Genre
  className?: string
}) {
  if (!genre) {
    return null
  }

  return (
    <i
      aria-hidden="true"
      data-slot="genre-dot"
      className={cn(
        'inline-block size-[7px] shrink-0 rounded-full',
        GENRE_MARK_CLASS[genre],
        className,
      )}
    />
  )
}
