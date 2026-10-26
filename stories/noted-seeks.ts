import type { SeekEvent, SkipWrite } from '@/repository/recording-segments'

/** The seeks the stories sent where the page would send them to the backend, in the order they were sent. */
export const seeks: SeekEvent[] = []

/** The seeks the stories sent the way that outlives the page, when it was hidden or put away. */
export const seeksWhileLeaving: SeekEvent[] = []

export async function seekNoted(
  id: string,
  seek: SeekEvent,
): Promise<SkipWrite> {
  seeks.push(seek)

  return { state: 'ok' }
}

export function seekSentWhileLeaving(id: string, seek: SeekEvent): void {
  seeksWhileLeaving.push(seek)
}
