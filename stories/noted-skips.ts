import type { SkipEvent, SkipWrite } from '@/repository/recording-segments'

/** What the stories sent where the page would send it to the backend, in the order it was sent. */
export const skips: SkipEvent[] = []

export async function skipNoted(
  id: string,
  skip: SkipEvent,
): Promise<SkipWrite> {
  skips.push(skip)

  return { state: 'ok' }
}
