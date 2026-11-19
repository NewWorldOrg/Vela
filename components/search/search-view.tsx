'use client'

import type { Noticing } from '@/lib/notifications'
import type { SearchResult } from '@/repository/search'
import { searchTermsQueryOf } from '@/repository/search-options'
import type { ReservationWrite } from '@/repository/reservations'
import { SearchScreen } from '@/components/search/search-screen'

export interface Reserving {
  onReserve?: (programmeId: string) => Promise<ReservationWrite>
  onCancel?: (id: string) => Promise<ReservationWrite>
  onRestore?: (id: string) => Promise<ReservationWrite>
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
