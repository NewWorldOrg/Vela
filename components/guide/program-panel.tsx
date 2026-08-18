'use client'

import Link from 'next/link'

import type { Channel } from '@/repository/channels'
import type { Program } from '@/repository/programs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/vela/icon-button'
import { CloseIcon, PlusIcon, SuccessIcon } from '@/components/vela/icons'

export function ProgramPanel({
  program,
  channel,
  dayLabel,
  onClose,
}: {
  program: Program
  channel?: Channel
  dayLabel: string
  onClose: () => void
}) {
  return (
    <aside className="w-[332px] shrink-0 self-start rounded-lg border border-line-strong bg-surface shadow-pop-xl max-[1200px]:w-full">
      <div className="flex items-start gap-2.5 border-b border-line px-[18px] py-3.5">
        <h2 className="heading min-w-0 flex-1 text-[15px] leading-snug">
          {program.title}
        </h2>
        <IconButton
          aria-label="閉じる"
          variant="quiet"
          size="sm"
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      </div>
      <div className="px-[18px] py-4">
        <p className="text-ui text-ink-2">
          <b className="mr-1.5 font-code font-medium text-ink-3">
            {channel?.no}
          </b>
          {channel?.name}
        </p>
        <p className="mt-0.5 font-code text-ui text-ink-2">
          {dayLabel} {program.startLabel}–
          {program.endUndecided ? '終了未定' : program.endLabel}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Badge>{program.genreLabel}</Badge>
          {program.subtitled && <Badge variant="info">字幕あり</Badge>}
        </div>
        {(program.detail || program.description) && (
          <p className="mt-3 text-ui leading-relaxed text-ink-2">
            {program.detail ?? program.description}
          </p>
        )}
        {program.cast && (
          <p className="mt-2 text-note leading-relaxed text-ink-3">
            {program.cast.join(' / ')}
          </p>
        )}
        <hr className="my-4 border-t border-dashed border-line" />

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

        <Button variant="ghost" size="sm" className="mt-4 w-full" asChild>
          <Link href={`/guide/programs/${program.id}`}>番組詳細を開く</Link>
        </Button>
      </div>
    </aside>
  )
}
