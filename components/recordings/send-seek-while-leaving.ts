import { recordingSeeksHref, seekBody } from '@/repository/recording-seek-paths'
import type { SeekEvent } from '@/repository/recording-segments'

export type SendSeekWhileLeaving = (id: string, seek: SeekEvent) => void

/**
 * Sends a seek from the browser as one request kept alive past the page, for when the page is hidden or put away and
 * may never run again. Its answer is read by nothing.
 */
export const sendSeekWhileLeaving: SendSeekWhileLeaving = (id, seek) => {
  const unsent = (error: unknown) =>
    console.warn('[seeks] one was not sent while leaving', id, error)

  try {
    void fetch(recordingSeeksHref(id), {
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(seekBody(seek)),
    }).catch(unsent)
  } catch (error) {
    unsent(error)
  }
}
