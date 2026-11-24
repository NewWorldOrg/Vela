import { TabBadge } from '@/components/vela/tab-bar'
import { conflictsLeft } from '@/repository/conflicts-left'

export async function ConflictsBadge() {
  const count = await conflictsLeft()

  if (count === 0) {
    return null
  }

  return <TabBadge count={count} saying={`競合 ${count} 件`} />
}
