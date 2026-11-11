import { NavCount } from '@/components/vela/global-nav'
import { conflictsLeft } from './conflicts-left'

/** The count beside 予約 in the bar at the top. */
export async function ConflictsCount() {
  const count = await conflictsLeft()

  if (count === 0) {
    return null
  }

  return <NavCount count={count} saying={`競合 ${count} 件`} />
}
