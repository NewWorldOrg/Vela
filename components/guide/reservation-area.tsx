'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useState } from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import type { ConflictEntry, ReservationWrite } from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import { ListIcon, RecordIcon } from '@/components/vela/icons'
import { ReserveButton } from '@/components/guide/reserve-button'
import { DisplacedNotice } from '@/components/reservations/displaced-notice'

type TellDisplaced = (entries: ConflictEntry[] | undefined) => void

const DisplacedTold = createContext<TellDisplaced>(() => {})

export function useTellDisplaced(): TellDisplaced {
  return useContext(DisplacedTold)
}

/** The programme's actions in one row; `first` (watching it live while it is on air) leads as the main button, and recording it steps back to a toned one whose circle stays the recording's red. */
export function ReservationArea({
  programmeId,
  booked,
  seriesHref,
  onReserve,
  first,
}: {
  programmeId: string
  booked?: ReactNode
  seriesHref?: string
  onReserve: (programmeId: string) => Promise<ReservationWrite>
  first?: ReactNode
}) {
  const [displaced, setDisplaced] = useState<ConflictEntry[]>()

  const reserve = async (id: string) => {
    setDisplaced(undefined)

    const result = await onReserve(id)

    setDisplaced(result.state === 'ok' ? result.displaced : undefined)

    return result
  }

  return (
    <DisplacedTold value={setDisplaced}>
      {booked && first && (
        <div className="mb-[calc(13rem/16)] flex flex-wrap gap-[calc(9rem/16)]">
          {first}
        </div>
      )}
      {booked ?? (
        <div className="flex flex-wrap gap-[calc(9rem/16)]">
          {first}
          <ReserveButton
            programmeId={programmeId}
            onReserve={reserve}
            variant={first ? 'tone' : 'default'}
          >
            <RecordIcon className={first ? 'text-rec' : undefined} />
            録画予約
          </ReserveButton>
          {seriesHref ? (
            <Button variant="tone" asChild>
              <Link href={seriesHref as Route}>
                <ListIcon />
                シリーズで予約
              </Link>
            </Button>
          ) : (
            <Button
              variant="tone"
              disabled
              title="番組名が読み取れないため、シリーズのルールにできません。"
            >
              <ListIcon />
              シリーズで予約
            </Button>
          )}
        </div>
      )}
      {displaced && (
        <div aria-live="polite" className="mt-3.5">
          <DisplacedNotice entries={displaced} className="px-0 py-0" />
        </div>
      )}
    </DisplacedTold>
  )
}
