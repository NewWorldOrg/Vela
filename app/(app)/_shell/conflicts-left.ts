import { cache } from 'react'
import { unstable_rethrow } from 'next/navigation'

import { countConflicts } from '@/repository/reservations'

export const conflictsLeft = cache(async (): Promise<number> =>
  countConflicts().catch((error: unknown) => {
    unstable_rethrow(error)

    return 0
  }),
)
