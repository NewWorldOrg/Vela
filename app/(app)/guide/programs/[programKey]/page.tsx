import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { PROGRAMS_EVENT, RESERVATIONS_EVENT } from '@/repository/events'
import { getProgram, primaryProgramKeyOf } from '@/repository/programs'
import { listBookings } from '@/repository/reservations'
import { RefreshOnSignal } from '@/components/vela/app-signals'
import { ProgramDetailView } from '@/components/guide/program-detail-page'
import {
  dropProgrammeReservation,
  reserveProgramme,
  reviseProgrammeReservation,
} from '@/app/(app)/guide/actions'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ programKey: string }>
}): Promise<Metadata> {
  const { programKey } = await params
  const detail = await getProgram(programKey)
  return { title: detail ? detail.program.title : 'ページが見つかりません' }
}

export default async function Page({
  params,
}: {
  params: Promise<{ programKey: string }>
}) {
  const { programKey } = await params
  const detail = await getProgram(programKey, new Date(), listBookings())
  if (!detail) {
    const primary = await primaryProgramKeyOf(programKey)

    if (primary !== undefined) {
      redirect(`/guide/programs/${primary}`)
    }

    notFound()
  }

  return (
    <>
      <RefreshOnSignal events={[PROGRAMS_EVENT, RESERVATIONS_EVENT]} />
      <ProgramDetailView
        detail={detail}
        onReserve={reserveProgramme}
        onCancel={dropProgrammeReservation}
        onRevise={reviseProgrammeReservation}
      />
    </>
  )
}
