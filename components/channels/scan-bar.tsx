'use client'

import { useState, useTransition } from 'react'

import type { ScanScope, StartScanResult } from '@/repository/services'
import type { ScanSystem } from '@/repository/scan-systems'
import { SCAN_SYSTEMS } from '@/repository/scan-systems'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'
import { SearchIcon } from '@/components/vela/icons'
import { SegmentedControl } from '@/components/vela/segmented-control'
import {
  TuningFields,
  useTuningEntry,
} from '@/components/channels/tuning-fields'

const EVERYTHING = 'everything'

const ONE_CHANNEL = 'channel'

type Range = typeof EVERYTHING | ScanSystem | typeof ONE_CHANNEL

const RANGES: { value: Range; label: string }[] = [
  { value: EVERYTHING, label: '全体' },
  ...SCAN_SYSTEMS,
  { value: ONE_CHANNEL, label: '物理ch指定' },
]

export function ScanBar({
  lastScan,
  onStart,
}: {
  lastScan: string
  onStart: (scope: ScanScope) => Promise<StartScanResult>
}) {
  const [range, setRange] = useState<Range>('isdbT')
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()
  const hold = useTuningEntry()

  const scopeOf = (): ScanScope | undefined => {
    if (range === EVERYTHING) {
      return { over: 'everything' }
    }

    if (range !== ONE_CHANNEL) {
      return { over: 'systems', systems: [range] }
    }

    const tuning = hold.read()

    return tuning && { over: 'channels', channels: [tuning] }
  }

  const start = () => {
    const scope = scopeOf()

    if (!scope) {
      return
    }

    startTransition(async () => {
      const result = await onStart(scope)

      setRefusal(result.state === 'started' ? undefined : result.message)
    })
  }

  return (
    <>
      <div className="mt-3.5 flex flex-wrap items-center gap-3 rounded-xl bg-surface px-[calc(17rem/16)] py-[calc(13rem/16)]">
        <SearchIcon className="size-4 text-brand" />
        <SegmentedControl
          label="スキャン範囲"
          options={RANGES}
          value={range}
          onValueChange={(next) => setRange(next as Range)}
        />
        {range === ONE_CHANNEL && (
          <TuningFields
            id="scan"
            hold={hold}
            className="basis-full flex-row flex-wrap items-start gap-x-6 gap-y-3.5 border-t border-dashed border-line pt-3.5"
            inputAreaClassName="w-[calc(192rem/16)]"
          />
        )}
        <span className="font-code text-cap tabular-nums whitespace-nowrap text-ink-3">
          {lastScan}
        </span>
        <Button
          size="sm"
          className="ml-auto"
          disabled={pending}
          onClick={start}
        >
          スキャン開始
        </Button>
      </div>
      {refusal && (
        <InlineAlert tone="warn" className="mt-2">
          {refusal}
        </InlineAlert>
      )}
    </>
  )
}
