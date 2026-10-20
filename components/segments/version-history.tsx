'use client'

import { useState, useTransition } from 'react'

import { NOT_YET_IN_THIS_BUILD, shapeFor } from '@/lib/not-yet-in-this-build'
import {
  NOT_APPLICABLE,
  backToAutomaticRefusalOf,
  boundaryMatchOf,
  switchRefusalOf,
  versionLabel,
} from '@/lib/segment-detection'
import type {
  SegmentRound,
  SegmentVersion,
  SegmentVersionState,
} from '@/repository/segment-status'
import type { SegmentVersionWrite } from '@/repository/segments'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  StateSay,
  StatusCell,
  type StateTone,
} from '@/components/recordings/status-cell'
import { InlineAlert } from '@/components/vela/banner'
import { MarkAxis } from '@/components/vela/icons'
import { InFull } from '@/components/vela/in-full'
import { Spinner } from '@/components/vela/progress'
import { SectionHeading } from '@/components/vela/section-heading'
import { LearningRounds } from '@/components/segments/learning-rounds'

export const VERSIONS_HEADING = 'モデルのバージョンの履歴'

const STATES: Record<SegmentVersionState, { word: string; tone: StateTone }> = {
  active: { word: '使用中', tone: 'ok' },
  candidate: { word: '候補', tone: 'info' },
  retired: { word: '使用終了', tone: 'mute' },
}

const ROLLED_BACK =
  '飛ばした直後に戻った割合が上がったため、前の版に戻しました。'

const COLUMNS = ['版', '作成', '状態', '境目の一致']

const ACTIONS = '操作'

const NUMBERS = 'font-code tabular-nums text-ink-2'

export type ChooseSegmentVersion = (
  number: number,
) => Promise<SegmentVersionWrite>

export type LeaveSegmentVersionToLearning = () => Promise<SegmentVersionWrite>

export function VersionHistory({
  versions,
  byHand,
  learning,
  lastRound,
  nextRound,
  onChoose,
  onLeaveToLearning,
}: {
  versions: SegmentVersion[]
  byHand: boolean
  learning: boolean
  lastRound?: SegmentRound
  nextRound: string
  onChoose: ChooseSegmentVersion
  onLeaveToLearning: LeaveSegmentVersionToLearning
}) {
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()
  const choosable =
    learning && versions.some((version) => version.state !== 'active')

  const leave = () => {
    if (pending) {
      return
    }

    setRefusal(undefined)

    startTransition(async () => {
      const result = await onLeaveToLearning()

      if (result.state !== 'ok') {
        setRefusal(backToAutomaticRefusalOf(result.state))
      }
    })
  }

  return (
    <>
      <div className="mb-[calc(11rem/16)] flex items-center gap-3">
        <SectionHeading mark={MarkAxis} className="mb-0 min-w-0 flex-1">
          {VERSIONS_HEADING}
        </SectionHeading>
        {learning && byHand && (
          <Button
            type="button"
            variant="halt"
            size="sm"
            aria-disabled={pending}
            onClick={leave}
          >
            {pending && <Spinner size="control" />}
            自動に戻す
          </Button>
        )}
      </div>
      <div aria-live="polite">
        {refusal && (
          <InlineAlert tone="warn" className="mb-3">
            {refusal}
          </InlineAlert>
        )}
      </div>
      <LearningRounds
        learning={learning}
        lastRound={lastRound}
        nextRound={nextRound}
      />
      {versions.length > 0 && (
        <Table className="min-w-[calc(640rem/16)]">
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
              {choosable && (
                <TableHead>
                  <span className="sr-only">{ACTIONS}</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((version) => (
              <TableRow key={version.number}>
                <TableCell className="font-bold">
                  {versionLabel(version.number)}
                </TableCell>
                <TableCell className={NUMBERS}>{version.trainedAt}</TableCell>
                <TableCell>
                  <StatusCell>
                    <Standing version={version} />
                  </StatusCell>
                </TableCell>
                <TableCell className={NUMBERS}>
                  {version.metrics
                    ? boundaryMatchOf(version.metrics.boundaryRecallWithin2s)
                    : NOT_APPLICABLE}
                </TableCell>
                {choosable && (
                  <TableCell className="text-right">
                    {version.state !== 'active' && (
                      <SwitchVersionButton
                        number={version.number}
                        onChoose={onChoose}
                      />
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}

function Standing({ version }: { version: SegmentVersion }) {
  const state = shapeFor(STATES, version.state, undefined)
  const said = (
    <StateSay tone={state?.tone ?? 'mute'} bold>
      {state?.word ?? NOT_YET_IN_THIS_BUILD}
    </StateSay>
  )

  return version.rolledBackAt ? (
    <InFull
      says={`${ROLLED_BACK}\n${version.rolledBackAt}`}
      wraps="inline-flex"
    >
      {said}
    </InFull>
  ) : (
    said
  )
}

function SwitchVersionButton({
  number,
  onChoose,
}: {
  number: number
  onChoose: ChooseSegmentVersion
}) {
  const [asking, setAsking] = useState(false)
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()
  const label = versionLabel(number)

  const choose = () => {
    if (pending) {
      return
    }

    startTransition(async () => {
      setRefusal(undefined)

      const result = await onChoose(number)

      if (result.state === 'ok') {
        setAsking(false)

        return
      }

      setRefusal(switchRefusalOf(result.state))
    })
  }

  return (
    <AlertDialog
      open={asking}
      onOpenChange={(open) => {
        if (!open) {
          setRefusal(undefined)
        }

        setAsking(open)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="change"
          size="sm"
          aria-label={`${label}に切り替え`}
        >
          切り替え
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}に切り替えます</AlertDialogTitle>
          <AlertDialogDescription>
            {`録画の CM・OP・ED の位置を${label}で判定し直します。自動では切り替わらなくなります。`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <span aria-live="polite">
          {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
        </span>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            variant="default"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              choose()
            }}
          >
            {pending && <Spinner size="control" />}
            切り替える
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
