import { unstable_rethrow } from 'next/navigation'

import { countConflicts } from '@/repository/reservations'
import { TabBadge } from '@/components/vela/app-shell'

/** The count of conflicts left unsettled, on the reservations tab. Nothing when there are none or they cannot be read: the tab is still the way to them. */
export async function ConflictsBadge() {
  const count = await countConflicts().catch((error: unknown) => {
    unstable_rethrow(error)

    return 0
  })

  if (count === 0) {
    return null
  }

  return <TabBadge count={count} saying={`競合 ${count} 件`} />
}
