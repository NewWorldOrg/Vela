import type { SeekEvent, SkipWrite } from '@/repository/recording-segments'

export const seeks: SeekEvent[] = []

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
