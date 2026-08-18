import Link from 'next/link'

import type { Channel } from '@/repository/channels'
import type { Program } from '@/repository/programs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeftIcon, PlusIcon, SuccessIcon } from '@/components/vela/icons'
import { ProgramDetailRow } from '@/components/guide/program-detail-row'

export function ProgramDetailView({
  program,
  channel,
  dayLabel,
}: {
  program: Program
  channel?: Channel
  dayLabel: string
}) {
  return (
    <main className="flex-1 px-3.5 pt-[18px] pb-16 min-[701px]:px-5 min-[1061px]:px-[30px]">
      <div className="mb-3 flex items-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/guide">
            <ChevronLeftIcon />
            番組表へ
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-[1.35fr_1fr] items-start gap-[18px] *:min-w-0 max-[1060px]:grid-cols-1">
        <section className="rounded-xl bg-surface px-[22px] py-5">
          <h1 className="heading text-[20px] leading-normal">
            {program.title}
          </h1>
          <div className="mt-3.5 border-t border-dashed border-line">
            <ProgramDetailRow label="チャンネル">
              {channel?.name}
              <small className="ml-[9px] font-code text-[11.5px] text-ink-3">
                {channel?.no}
              </small>
            </ProgramDetailRow>
            <ProgramDetailRow label="放送日時">
              <span className="font-code">
                {dayLabel} {program.startLabel}–
                {program.endUndecided ? '終了未定' : program.endLabel}
              </span>
            </ProgramDetailRow>
            <ProgramDetailRow label="ジャンル">
              <span className="mr-1.5 inline-block rounded-full border border-line bg-surface px-[11px] py-0.5 text-note font-medium text-ink-2">
                {program.genreLabel}
              </span>
              {program.subtitled && <Badge variant="info">字幕あり</Badge>}
            </ProgramDetailRow>
          </div>
          {(program.detail || program.description) && (
            <p className="my-3.5 max-w-[560px] text-[13px] leading-[1.9] text-ink-2">
              {program.detail ?? program.description}
            </p>
          )}
          {program.cast && (
            <p className="text-note leading-relaxed text-ink-3">
              {program.cast.join(' / ')}
            </p>
          )}
        </section>

        <section className="rounded-xl bg-surface px-[22px] py-5">
          <h2 className="heading mb-3.5 text-[15px]">録画予約</h2>
          {program.booked ? (
            <>
              <div className="rounded-lg bg-mint-soft px-3.5 py-3">
                <div className="flex items-center gap-1.5 text-ui font-bold text-mint">
                  <SuccessIcon className="size-4" />
                  チューナー確保済み
                </div>
                <p className="mt-1 text-sub leading-relaxed text-ink-2">
                  <b>地上波</b>のチューナーを 1 本、{dayLabel}{' '}
                  {program.startLabel} の 10 秒前から確保しました。
                </p>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  title="予約の編集はこれから実装されます"
                >
                  予約を編集
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled
                  title="予約の取り消しはこれから実装されます"
                >
                  予約を取り消す
                </Button>
              </div>
              <p className="mt-2.5 text-note leading-relaxed text-ink-3">
                録画の 10 秒前から開始し、終了 30 秒後まで延長に追従します。
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button disabled title="録画予約はこれから実装されます">
                  <PlusIcon />
                  録画予約
                </Button>
                <Button
                  variant="ghost"
                  disabled
                  title="シリーズ予約はこれから実装されます"
                >
                  シリーズで予約
                </Button>
              </div>
              <p className="mt-2.5 text-note leading-relaxed text-ink-3">
                予約した時点でチューナーを確保します。空きがない場合はこの場で競合として提示します。
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
