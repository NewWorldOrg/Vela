import type {
  AnsweredSegment,
  RecordingSegments,
  SegmentsWrite,
  SkipEvent,
  SkipWrite,
} from '@/repository/recording-segments'
import { DETECTED_SEGMENTS } from '@/repository/recording-segments.fixtures'

/** What the stories sent where the page would send it to the backend, in the order it was sent. */
export const answers: { segments: AnsweredSegment[]; confirmed: boolean }[] = []

export const withdrawals: string[] = []

export const skips: SkipEvent[] = []

function asAnswered(
  segments: AnsweredSegment[],
  confirmed: boolean,
): RecordingSegments {
  return {
    ...DETECTED_SEGMENTS,
    source: 'answered',
    modelVersion: undefined,
    confirmed,
    segments,
  }
}

export async function answeredAsSent(
  id: string,
  segments: AnsweredSegment[],
  confirmed: boolean,
): Promise<SegmentsWrite> {
  answers.push({ segments, confirmed })

  return { state: 'ok', segments: asAnswered(segments, confirmed) }
}

export async function refusedForOverlapping(
  id: string,
  segments: AnsweredSegment[],
  confirmed: boolean,
): Promise<SegmentsWrite> {
  answers.push({ segments, confirmed })

  return { state: 'refused', refusal: 'overlap' }
}

export async function withdrawnToTheDetection(
  id: string,
): Promise<SegmentsWrite> {
  withdrawals.push(id)

  return { state: 'ok', segments: DETECTED_SEGMENTS }
}

export async function skipNoted(
  id: string,
  skip: SkipEvent,
): Promise<SkipWrite> {
  skips.push(skip)

  return { state: 'ok' }
}
