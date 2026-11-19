import type { SkipEvent, SkipWrite } from '@/repository/recording-segments'

export const skips: SkipEvent[] = []

export async function skipNoted(
  id: string,
  skip: SkipEvent,
): Promise<SkipWrite> {
  skips.push(skip)

  return { state: 'ok' }
}
