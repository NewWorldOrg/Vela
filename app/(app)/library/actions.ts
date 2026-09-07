'use server'

import { revalidatePath } from 'next/cache'

import type { RecordingDiscarded } from '@/repository/recordings'
import { discardRecording } from '@/repository/recordings'

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
