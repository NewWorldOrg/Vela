import { NO_RESIDENCE, type Residence } from '@/lib/bml/receiver-info'
import { RESIDENCE_PATH, residenceRead } from '@/repository/residence'

/** Longer than Carina takes to read one row, short enough that a data broadcast waiting on it still opens. */
export const RESIDENCE_GIVEN_UP_AFTER_MS = 5_000

type Send = (input: string, init: RequestInit) => Promise<Response>

/** The receiver's residence as Carina keeps it, for the documents to read. One that cannot be read is not registered. */
export async function residenceFromCarina(
  send: Send = (input, init) => fetch(input, init),
): Promise<Residence> {
  try {
    const answer = await send(RESIDENCE_PATH, {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(RESIDENCE_GIVEN_UP_AFTER_MS),
    })

    return residenceRead(
      answer.status,
      answer.ok ? await answer.json() : undefined,
    )
  } catch {
    return NO_RESIDENCE
  }
}
