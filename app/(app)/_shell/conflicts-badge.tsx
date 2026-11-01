import { cache } from 'react'
import { unstable_rethrow } from 'next/navigation'

import { countConflicts } from '@/repository/reservations'
import { NavCount, TabBadge } from '@/components/vela/app-shell'

/** The count of conflicts left unsettled, read once per request for both places that show it. Nothing when they cannot be read: the reservations are still the way to them. */
const conflictsLeft = cache(async (): Promise<number> =>
  countConflicts().catch((error: unknown) => {
    unstable_rethrow(error)

    return 0
  }),
)

/** The count on the reservations tab at the foot of a phone. */
export async function ConflictsBadge() {
  const count = await conflictsLeft()

  if (count === 0) {
    return null
  }

  return <TabBadge count={count} saying={`競合 ${count} 件`} />
}

/** The count beside 予約 in the bar at the top. */
export async function ConflictsCount() {
  const count = await conflictsLeft()

  if (count === 0) {
    return null
  }

  return <NavCount count={count} saying={`競合 ${count} 件`} />
}
