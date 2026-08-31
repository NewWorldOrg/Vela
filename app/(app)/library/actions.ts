'use server'

import { revalidatePath } from 'next/cache'

import type { RecordingDiscarded } from '@/repository/recordings'
import { discardRecording } from '@/repository/recordings'

const LIBRARY = '/library'

/**
 * The library holds the only way a recording is thrown away, and the detail
 * screen reaches the same one: both lists are read afresh behind it, and the
 * row that was removed is gone from each.
 */
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
