import Link from 'next/link'

import { isOnAir } from '@/lib/guide'
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
  const { program, channel, day, nowMin } = detail

  return (
    <ScreenMain className="pb-16">
      <div className="mx-auto max-w-[calc(780rem/16)] px-6 pt-[calc(22rem/16)] max-[700px]:px-3.5">
        <Button variant="watch" size="sm" className="mb-3.5" asChild>
          <Link href="/guide">
            <ChevronLeftIcon />
            番組表へ
          </Link>
        </Button>

        <section className="rounded-xl bg-surface px-[calc(30rem/16)] pt-[calc(26rem/16)] pb-[calc(22rem/16)] max-[700px]:px-[calc(18rem/16)] max-[700px]:pt-[calc(22rem/16)]">
          <h1 className="heading mb-[calc(13rem/16)] text-[calc(23rem/16)] leading-normal">
            {program.title}
          </h1>
          <ProgramDetailBody
            program={program}
            channel={channel}
            dayLabel={day.label}
            onAir={isOnAir(program, nowMin)}
            onReserve={onReserve}
          />
        </section>
      </div>
    </ScreenMain>
  )
}
