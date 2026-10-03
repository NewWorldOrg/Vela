'use client'

import { useState } from 'react'

import type {
  TuningEntry,
  TuningProblem,
  TuningReading,
} from '@/lib/tuning-entry'
import {
  EMPTY_TUNING_ENTRY,
  TUNING_STREAM_HIGHEST,
  readTuningEntry,
  tuningChannelRangeOf,
} from '@/lib/tuning-entry'
import { cn } from '@/lib/utils'
import type { ScanSystem } from '@/repository/scan-systems'
import { SCAN_SYSTEMS } from '@/repository/scan-systems'
import type { CandidateTuning } from '@/repository/services'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
  RequiredMark,
} from '@/components/vela/field'
import { SegmentedControl } from '@/components/vela/segmented-control'

export interface TuningEntryHold {
  entry: TuningEntry
  problem?: TuningProblem
  amend: (part: Partial<TuningEntry>) => void
  read: () => CandidateTuning | undefined
  reset: () => void
}

export function useTuningEntry(): TuningEntryHold {
  const [entry, setEntry] = useState<TuningEntry>(EMPTY_TUNING_ENTRY)
  const [problem, setProblem] = useState<TuningProblem>()

  return {
    entry,
    problem,
    amend: (part) => {
      setEntry((previous) => ({ ...previous, ...part }))

      if (part.system !== undefined) {
        setProblem(undefined)
      }
    },
    read: () => {
      const reading: TuningReading = readTuningEntry(entry)

      setProblem(reading.state === 'refused' ? reading.problem : undefined)

      return reading.state === 'read' ? reading.tuning : undefined
    },
    reset: () => {
      setEntry((previous) => ({ ...previous, channel: '', stream: '' }))
      setProblem(undefined)
    },
  }
}

export function TuningFields({
  id,
  hold,
  className,
  inputAreaClassName,
}: {
  id: string
  hold: TuningEntryHold
  className?: string
  inputAreaClassName?: string
}) {
  const { entry, problem, amend } = hold
  const range = tuningChannelRangeOf(entry.system)

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <Field>
        <FieldLabel>
          方式
          <RequiredMark />
        </FieldLabel>
        <SegmentedControl
          aria-label="方式"
          options={SCAN_SYSTEMS}
          value={entry.system}
          onValueChange={(next) => amend({ system: next as ScanSystem })}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${id}-channel`}>
          物理チャンネル
          <RequiredMark />
        </FieldLabel>
        <Input
          id={`${id}-channel`}
          areaClassName={inputAreaClassName}
          inputMode="numeric"
          value={entry.channel}
          aria-invalid={problem?.field === 'channel' || undefined}
          aria-describedby={
            problem?.field === 'channel' ? `${id}-channel-error` : undefined
          }
          onChange={(event) => amend({ channel: event.target.value })}
        />
        <FieldHint>{range.hint}</FieldHint>
        <span aria-live="polite">
          {problem?.field === 'channel' && (
            <FieldError id={`${id}-channel-error`}>{problem.text}</FieldError>
          )}
        </span>
      </Field>

      {range.ts && (
        <Field>
          <FieldLabel htmlFor={`${id}-stream`}>
            TSID
            <RequiredMark />
          </FieldLabel>
          <Input
            id={`${id}-stream`}
            areaClassName={inputAreaClassName}
            inputMode="numeric"
            value={entry.stream}
            aria-invalid={problem?.field === 'stream' || undefined}
            aria-describedby={
              problem?.field === 'stream' ? `${id}-stream-error` : undefined
            }
            onChange={(event) => amend({ stream: event.target.value })}
          />
          <FieldHint>0 〜 {TUNING_STREAM_HIGHEST}</FieldHint>
          <span aria-live="polite">
            {problem?.field === 'stream' && (
              <FieldError id={`${id}-stream-error`}>{problem.text}</FieldError>
            )}
          </span>
        </Field>
      )}
    </div>
  )
}
