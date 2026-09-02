import Link from 'next/link'

import type { ProgramDetail } from '@/repository/programs'
import type { ReservationWrite } from '@/repository/reservations'
import { Button } from '@/components/ui/button'
import { ChevronLeftIcon } from '@/components/vela/icons'
import { ProgramDetailBody } from '@/components/guide/program-detail'
import { ScreenMain } from '@/components/vela/app-shell'

export function ProgramDetailView({
  detail,
  onReserve,
}: {
  detail: ProgramDetail
  onReserve: (programmeId: string) => Promise<ReservationWrite>
}) {
  const { program, channel, day } = detail

  return (
    <ScreenMain className="pb-16">
      <div className="mx-auto max-w-[780px] px-6 pt-[22px] max-[700px]:px-3.5">
        <Button variant="ghost" size="sm" className="mb-3.5" asChild>
          <Link href="/guide">
            <ChevronLeftIcon />
            番組表へ
          </Link>
        </Button>

        <section className="rounded-xl bg-surface px-[30px] pt-[26px] pb-[22px] max-[700px]:px-[18px] max-[700px]:pt-[22px]">
          <h1 className="heading mb-[13px] text-[23px] leading-normal">
            {program.title}
          </h1>
          <ProgramDetailBody
            program={program}
            channel={channel}
            dayLabel={day.label}
            onReserve={onReserve}
          />
        </section>
      </div>
    </ScreenMain>
  )
}
