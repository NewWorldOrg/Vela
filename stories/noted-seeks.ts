import type { SeekEvent, SkipWrite } from '@/repository/recording-segments'

/** The seeks the stories sent where the page would send them to the backend, in the order they were sent. */
export const seeks: SeekEvent[] = []

export async function seekNoted(
  id: string,
  seek: SeekEvent,
): Promise<SkipWrite> {
  seeks.push(seek)

  return { state: 'ok' }
}
