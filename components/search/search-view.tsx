'use client'

import type { Noticing } from '@/lib/notifications'
import type { SearchResult } from '@/repository/search'
import { searchTermsQueryOf } from '@/repository/search-options'
import type { ReservationWrite } from '@/repository/reservations'
import { SearchScreen } from '@/components/search/search-screen'

export interface Reserving {
  /** Reserves a hit in one press, from the phone's circle. */
  onReserve?: (programmeId: string) => Promise<ReservationWrite>
  /** Takes back a hit's reservation, from the circle or the toast. */
  onCancel?: (id: string) => Promise<ReservationWrite>
  /** Puts back a reservation the circle took back. */
  onRestore?: (id: string) => Promise<ReservationWrite>
  /** Asks for a notice when a hit starts, and takes one back, from the detail beside the list. */
  noticing?: Noticing
}

export function SearchView({
  result,
  ...reserving
}: Reserving & { result: SearchResult }) {
  return (
    <SearchScreen
      key={searchTermsQueryOf(result.condition)}
      result={result}
      {...reserving}
    />
  )
}
