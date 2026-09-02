'use client'

import { useState, useTransition } from 'react'

import type { CollectionStatus, RebuildResult } from '@/repository/collection'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'
import { CheckIcon, RebuildIcon } from '@/components/vela/icons'

/**
 * The confirmation gate in front of the one destructive EPG operation. It
 * spells out what is discarded, how it comes back and what stays, so the
 * press is informed rather than brave.
 */
export function RebuildEpgDialog({
  open,
  onOpenChange,
  kindCounts,
  onRebuild,
  onDiscarded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kindCounts: CollectionStatus['kindCounts']
  onRebuild: () => Promise<RebuildResult>
  onDiscarded: (discarded: number) => void
}) {
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()

  const run = () =>
    startTransition(async () => {
      setRefusal(undefined)

      const result = await onRebuild()

      if (result.state === 'ok') {
        onDiscarded(result.discarded)
        onOpenChange(false)

        return
      }

      setRefusal(
        result.state === 'unauthenticated'
          ? 'サインインが切れているため、実行できませんでした。'
          : result.message,
      )
    })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[560px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RebuildIcon className="size-[19px] text-coral" />
            EPG 全破棄 → 再構築
          </AlertDialogTitle>
        </AlertDialogHeader>

        <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3.5 gap-y-2.5 text-ui max-[700px]:grid-cols-1">
          <dt className="pt-0.5 text-sub text-ink-3">消えるもの</dt>
          <dd className="leading-[1.7]">
            いまの番組表のデータ(未来{' '}
            <span className="font-code tabular-nums">8</span> 日+過去{' '}
            <span className="font-code tabular-nums">24</span> 時間)
          </dd>
        </dl>

        <div className="rounded-xl bg-mint-soft px-3.5 py-[11px]">
          <div className="flex items-center gap-2 text-sub font-bold text-mint">
            <CheckIcon className="size-[15px]" />
            消えないもの
          </div>
          <ul className="mt-1 space-y-0.5 text-sub leading-[1.75] text-ink-2">
            <li className="flex gap-2">
              <span
                aria-hidden="true"
                className="mt-[0.7em] size-[5px] shrink-0 rounded-full bg-mint"
              />
              <span>
                <b className="font-bold text-ink">過去番組のアーカイブ</b>
              </span>
            </li>
            <li className="flex gap-2">
              <span
                aria-hidden="true"
                className="mt-[0.7em] size-[5px] shrink-0 rounded-full bg-mint"
              />
              <span>
                <b className="font-bold text-ink">予約とチャンネル定義</b>
              </span>
            </li>
            <li className="flex gap-2">
              <span
                aria-hidden="true"
                className="mt-[0.7em] size-[5px] shrink-0 rounded-full bg-mint"
              />
              <span>
                <b className="font-bold text-ink">録画済み番組の情報</b>
              </span>
            </li>
          </ul>
        </div>

        <span aria-live="polite">
          {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
        </span>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>キャンセル</AlertDialogCancel>
          <Button variant="destructiveFill" disabled={pending} onClick={run}>
            <RebuildIcon />
            全て破棄して再構築する
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
