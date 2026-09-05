'use server'

import { revalidatePath } from 'next/cache'

import type { EncodeWrite } from '@/repository/encode'
import { queueEncode } from '@/repository/encode'
import type { ThumbnailWrite } from '@/repository/recordings'
import { remakeThumbnail } from '@/repository/recordings'
import type { TicketWrite } from '@/repository/videos'
import { takePlaybackTicket } from '@/repository/videos'

export async function redrawThumbnail(id: string): Promise<ThumbnailWrite> {
  const result = await remakeThumbnail(id)

  if (result.state === 'ok') {
    revalidatePath(`/recordings/${id}`)
    revalidatePath('/library')
  }

  return result
}

/**
 * A ticket for a player outside the browser. It lapses in half a minute, so it
 * is taken when the button is pressed rather than drawn into the page.
 */
export async function takeTicket(id: string): Promise<TicketWrite> {
  return takePlaybackTicket(id)
}

export async function queueEncoding(
  recordingId: string,
  destinationId: string,
  profileId?: string,
): Promise<EncodeWrite> {
  const result = await queueEncode(recordingId, destinationId, profileId)

  if (result.state === 'ok') {
    revalidatePath('/settings/encode')
  }

  return result
}
