'use client'

import { useState, useTransition } from 'react'

import { NOT_YET_IN_THIS_BUILD, shapeFor } from '@/lib/not-yet-in-this-build'
import {
  NOT_APPLICABLE,
  backToAutomaticRefusalOf,
  boundaryMatchOf,
  versionLabel,
} from '@/lib/segment-detection'
import type {
  SegmentRound,
  SegmentVersion,
  SegmentVersionState,
} from '@/repository/segment-status'
import type { SegmentVersionWrite } from '@/repository/segments'
import { Button } from '@/components/ui/button'
import { ActionRow } from '@/components/vela/action-row'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cardPlace } from '@/components/ui/table-cards'
import {
  StateSay,
  StatusCell,
  type StateTone,
} from '@/components/recordings/status-cell'
import { InlineAlert } from '@/components/vela/inline-alert'
import { InFull } from '@/components/vela/in-full'
import { Spinner } from '@/components/vela/spinner'
import { SectionHeading } from '@/components/vela/section-heading'
import { LearningRounds } from '@/components/segments/learning-rounds'
import { VERSIONS_HEADING } from '@/components/segments/wording'
import { SwitchVersionButton } from '@/components/segments/switch-version-button'

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
  lastRound,
  nextRound,
  onChoose,
  onLeaveToLearning,
}: {
  versions: SegmentVersion[]
  byHand: boolean
  lastRound?: SegmentRound
  nextRound?: string
  onChoose: ChooseSegmentVersion
  onLeaveToLearning: LeaveSegmentVersionToLearning
}) {
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()
  const choosable = versions.some((version) => version.state !== 'active')

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
        <SectionHeading className="mb-0 min-w-0 flex-1">
          {VERSIONS_HEADING}
        </SectionHeading>
        {byHand && (
          <Button
            type="button"
            variant="tone"
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
      <LearningRounds lastRound={lastRound} nextRound={nextRound} />
      {versions.length > 0 && (
        <Table cards className="min-w-[calc(640rem/16)]">
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
                <TableCell {...cardPlace('lead')} className="font-semibold">
                  {versionLabel(version.number)}
                </TableCell>
                <TableCell
                  {...cardPlace('field', COLUMNS[1])}
                  className={NUMBERS}
                >
                  {version.trainedAt}
                </TableCell>
                <TableCell {...cardPlace('field', COLUMNS[2])}>
                  <StatusCell>
                    <Standing version={version} />
                  </StatusCell>
                </TableCell>
                <TableCell
                  {...cardPlace('field', COLUMNS[3])}
                  className={NUMBERS}
                >
                  {version.metrics
                    ? boundaryMatchOf(version.metrics.boundaryRecallWithin2s)
                    : NOT_APPLICABLE}
                </TableCell>
                {choosable && (
                  <TableCell {...cardPlace('actions')} className="text-right">
                    {version.state !== 'active' && (
                      <ActionRow>
                        <SwitchVersionButton
                          number={version.number}
                          onChoose={onChoose}
                        />
                      </ActionRow>
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
