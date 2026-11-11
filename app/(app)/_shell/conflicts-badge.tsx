import { TabBadge } from '@/components/vela/tab-bar'
import { conflictsLeft } from '@/app/(app)/_shell/conflicts-left'

/** The count on the reservations tab at the foot of a phone. */
export async function ConflictsBadge() {
  const count = await conflictsLeft()

  if (count === 0) {
    return null
  }

  return <TabBadge count={count} saying={`競合 ${count} 件`} />
}
