'use server'

import { revalidatePath } from 'next/cache'

import type {
  RecordingBatch,
  RecordingDiscarded,
} from '@/repository/recordings'
import { discardRecording, discardRecordings } from '@/repository/recordings'

const LIBRARY = '/library'

export async function throwRecordingAway(
  id: string,
): Promise<RecordingDiscarded> {
  const result = await discardRecording(id)

  if (result.state === 'ok') {
    revalidatePath(LIBRARY)
    revalidatePath(`/recordings/${id}`)
  }

  return result
}

export async function throwRecordingsAway(
  ids: string[],
): Promise<RecordingBatch> {
  const result = await discardRecordings(ids)

  revalidatePath(LIBRARY)

  for (const id of ids.slice(0, result.done)) {
    revalidatePath(`/recordings/${id}`)
  }

  return result
}
