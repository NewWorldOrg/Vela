import { NavCount } from '@/components/vela/global-nav'
import { conflictsLeft } from '@/repository/conflicts-left'

export async function ConflictsCount() {
  const count = await conflictsLeft()

  if (count === 0) {
    return null
  }

  return <NavCount count={count} saying={`競合 ${count} 件`} />
}
