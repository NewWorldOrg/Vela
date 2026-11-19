import { NO_RESIDENCE, type Residence } from '@/lib/bml/receiver-info'
import { RESIDENCE_PATH, residenceRead } from '@/repository/residence'

export const RESIDENCE_GIVEN_UP_AFTER_MS = 5_000

type Send = (input: string, init: RequestInit) => Promise<Response>

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
