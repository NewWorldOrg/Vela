'use client'

import { useState, useTransition } from 'react'

import type {
  CandidateRow,
  CandidateTuning,
  WriteResult,
} from '@/repository/services'
import { CANDIDATE_UNLOCKED_TERM } from '@/lib/state-terms'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { InlineAlert } from '@/components/vela/banner'
import { PlusIcon, TrashIcon, WarningIcon } from '@/components/vela/icons'
import { ProgressBar } from '@/components/vela/progress'
import { AddCandidateDialog } from '@/components/channels/add-candidate-dialog'
import { TermTip } from '@/components/vela/term-tip'

/**
 * The three the requirements name — locked, not locked, never measured — said
 * as the chip the design system carries for them. The state is on every row,
 * whether or not a figure came with it: a candidate that answered with a
 * carrier-to-noise reading it had no lock for would otherwise show a meter and
 * nothing to say the frontend never locked.
 */
const RECEPTION_BADGE: Record<
  CandidateRow['reception'],
  { variant: 'ok' | 'err' | 'mute'; label: string }
> = {
  locked: { variant: 'ok', label: '受信可' },
  unlocked: { variant: 'err', label: CANDIDATE_UNLOCKED_TERM.label },
  unread: { variant: 'mute', label: '未計測' },
}

/** The chip says which state it is; this says what that meant for the figure. */
const RECEPTION_WITHOUT_FIGURE: Record<CandidateRow['reception'], string> = {
  locked: '品質の数値はこのチューナーから取れません',
  unlocked: '同調しないため測定できていません',
  unread: 'まだ測定していません',
}

/**
 * 受信不可 is the one of the three that says less than it looks like it says:
 * it is this candidate failing to lock, not the service being off the air, and
 * the same word on the reservation screen means something else again. The
 * other two read as themselves and carry nothing.
 */
function ReceptionBadge({
  reception,
}: {
  reception: CandidateRow['reception']
}) {
  const badge = (
    <Badge variant={RECEPTION_BADGE[reception].variant}>
      {RECEPTION_BADGE[reception].label}
    </Badge>
  )

  if (reception !== 'unlocked') {
    return badge
  }

  return <TermTip term={CANDIDATE_UNLOCKED_TERM}>{badge}</TermTip>
}

function CandidateMeter({ candidate }: { candidate: CandidateRow }) {
  if (candidate.measurement === undefined) {
    return (
      <span className="w-[280px] max-w-full text-sub text-ink-3">
        {RECEPTION_WITHOUT_FIGURE[candidate.reception]}
      </span>
    )
  }

  return (
    <span className="flex max-w-[280px] flex-1 items-center gap-[9px]">
      <ProgressBar
        value={candidate.measurement.percent}
        tone={candidate.measurement.tone}
        label={`${candidate.channel} ${candidate.measurement.value}`}
        className="h-1.5 flex-1"
      />
      <span className="w-16 text-right font-code text-sub tabular-nums text-ink-2">
        {candidate.measurement.value}
      </span>
    </span>
  )
}

/**
 * The API removes a candidate whether or not it is the selected one, and a
 * service with nothing selected has no way to be tuned. That is said before
 * the press, not discovered after it.
 */
function DeleteCandidateDialog({
  candidate,
  onOpenChange,
  onConfirm,
  pending,
}: {
  candidate: CandidateRow | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  pending: boolean
}) {
  return (
    <AlertDialog open={candidate !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>この候補チャンネルを削除します</AlertDialogTitle>
          <AlertDialogDescription>
            {candidate?.channel} を候補から外します。
          </AlertDialogDescription>
        </AlertDialogHeader>
        {candidate?.selected && (
          <p className="flex items-center gap-2 rounded-md bg-coral-soft px-3.5 py-2.5 text-ui font-medium text-coral">
            <WarningIcon className="size-4 shrink-0" />
            現在の選局先です。
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            variant="destructiveFill"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
          >
            <TrashIcon />
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * The candidates behind one service. Which one is selected is stated on the
 * row itself, and every other row carries the switch to it — so moving the
 * selection is a decision made in one place, not a side effect of a scan.
 */
export function CandidateList({
  serviceKey,
  serviceName,
  candidates,
  onSelect,
  onAdd,
  onDelete,
}: {
  serviceKey: string
  serviceName: string
  candidates: CandidateRow[]
  onSelect: (
    serviceKey: string,
    candidateChannelId: string,
  ) => Promise<WriteResult>
  onAdd: (serviceKey: string, tuning: CandidateTuning) => Promise<WriteResult>
  onDelete: (
    serviceKey: string,
    candidateChannelId: string,
  ) => Promise<WriteResult>
}) {
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<CandidateRow | null>(null)

  const toRefusal = (result: WriteResult, verb: string) =>
    result.state === 'unauthenticated'
      ? `サインインが切れているため、${verb}できませんでした。サインインしてから開き直してください。`
      : result.state === 'rejected'
        ? result.message
        : undefined

  return (
    <>
      <p className="mb-[9px] text-cap font-bold text-ink-3">候補チャンネル</p>
      {candidates.map((candidate) => (
        <div
          key={candidate.id}
          className={
            candidate.selected
              ? 'mb-1.5 flex flex-wrap items-center gap-4 rounded-lg border border-brand-line bg-brand-soft px-3.5 py-2.5'
              : 'mb-1.5 flex flex-wrap items-center gap-4 rounded-lg border border-transparent bg-surface px-3.5 py-2.5'
          }
        >
          <span className="w-[52px] font-code text-[13.5px] font-medium tabular-nums">
            {candidate.channel}
          </span>
          <CandidateMeter candidate={candidate} />
          <ReceptionBadge reception={candidate.reception} />
          {candidate.needsRevalidation && (
            <Badge variant="warn" className="font-bold">
              要再検証
            </Badge>
          )}
          {candidate.rotation && (
            <Badge variant="warn" className="font-bold">
              {candidate.rotation.label}
            </Badge>
          )}
          <span className="font-code text-cap tabular-nums whitespace-nowrap text-ink-3">
            発見 {candidate.discovered} · 評価 {candidate.lastSeen}
            {candidate.rotation && ` · ${candidate.rotation.note}`}
          </span>
          <span className="ml-auto flex items-center gap-2">
            {candidate.selected ? (
              <span className="rounded-full border border-brand-line bg-surface px-[11px] py-[3px] text-note font-bold whitespace-nowrap text-brand">
                ● 選択中
              </span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setRefusal(undefined)
                    setRefusal(
                      toRefusal(
                        await onSelect(serviceKey, candidate.id),
                        '切替',
                      ),
                    )
                  })
                }
              >
                これに切替
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              aria-label={`${candidate.channel} を候補から削除`}
              onClick={() => {
                setRefusal(undefined)
                setRemoving(candidate)
              }}
            >
              <TrashIcon />
            </Button>
          </span>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="mt-1.5"
        disabled={pending}
        onClick={() => {
          setRefusal(undefined)
          setAdding(true)
        }}
      >
        <PlusIcon />
        候補チャンネルを手動追加
      </Button>

      <AddCandidateDialog
        serviceKey={serviceKey}
        serviceName={serviceName}
        open={adding}
        onOpenChange={setAdding}
        onAdd={onAdd}
      />

      <DeleteCandidateDialog
        candidate={removing}
        pending={pending}
        onOpenChange={(open) => !open && setRemoving(null)}
        onConfirm={() => {
          const target = removing

          if (target === null) {
            return
          }

          startTransition(async () => {
            const result = await onDelete(serviceKey, target.id)

            setRemoving(null)
            setRefusal(toRefusal(result, '削除'))
          })
        }}
      />

      <span aria-live="polite">
        {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
      </span>
    </>
  )
}
