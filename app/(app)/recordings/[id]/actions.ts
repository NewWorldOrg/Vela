'use server'

import { revalidatePath } from 'next/cache'

import type { ThumbnailWrite } from '@/repository/recordings'
import { remakeThumbnail } from '@/repository/recordings'

export async function redrawThumbnail(id: string): Promise<ThumbnailWrite> {
  const result = await remakeThumbnail(id)

  if (result.state === 'ok') {
    revalidatePath(`/recordings/${id}`)
    revalidatePath('/library')
  }

  return result
}
