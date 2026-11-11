import { cache } from 'react'
import { unstable_rethrow } from 'next/navigation'

import { countConflicts } from '@/repository/reservations'

/** The count of conflicts left unsettled, read once per request for both places that show it. Nothing when they cannot be read: the reservations are still the way to them. */
export const conflictsLeft = cache(async (): Promise<number> =>
  countConflicts().catch((error: unknown) => {
    unstable_rethrow(error)

    return 0
  }),
)
