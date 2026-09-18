import { wordFor } from '@/lib/not-yet-in-this-build'
import type { components } from '@/repository/client/schema'

export type PlaybackSource = components['schemas']['PlaybackSource']

const SOURCE_LABEL: Record<PlaybackSource, string> = {
  artefact: 'エンコード済み',
  recording: '元のまま',
}

export const BOTH_SOURCES: readonly PlaybackSource[] = Object.keys(
  SOURCE_LABEL,
) as PlaybackSource[]

export const THE_ARTEFACT: PlaybackSource = 'artefact'

export const THE_RECORDING_ITSELF: PlaybackSource = 'recording'

export function sourceThisBuildKnows(
  asked: string | undefined,
): PlaybackSource | undefined {
  return BOTH_SOURCES.find((one) => one === asked)
}

export function sourceLabel(source: PlaybackSource): string {
  return wordFor(SOURCE_LABEL, source)
}
