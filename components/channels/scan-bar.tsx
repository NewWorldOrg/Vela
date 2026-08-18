'use client'

import { useState, useTransition } from 'react'

import type { StartScanResult } from '@/repository/services'
import type { ScanSystem } from '@/repository/scan-systems'
import { SCAN_SYSTEMS } from '@/repository/scan-systems'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'
import { SearchIcon } from '@/components/vela/icons'
import { SegmentedControl } from '@/components/vela/segmented-control'

/**
 * The range and the start. A second start is refused by the API with the id of
 * the run already walking; the page is re-read either way, so a refusal lands
 * on that run rather than on a bare failure. What is left to say here is a
 * start the tuners could not take at all.
 */
export function ScanBar({
  lastScan,
  onStart,
}: {
  lastScan: string
  onStart: (systems: ScanSystem[]) => Promise<StartScanResult>
}) {
  const [system, setSystem] = useState<ScanSystem>('isdbT')
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  return (
    <>
      <div className="mt-3.5 flex flex-wrap items-center gap-3 rounded-xl bg-surface px-[17px] py-[13px]">
        <SearchIcon className="size-4 text-brand" />
        <span className="text-ui font-medium whitespace-nowrap text-ink-2">
          スキャン範囲
        </span>
        <SegmentedControl
          aria-label="スキャン範囲"
          options={SCAN_SYSTEMS}
          value={system}
          onValueChange={(next) => setSystem(next as ScanSystem)}
        />
        <span className="font-code text-cap tabular-nums whitespace-nowrap text-ink-3">
          {lastScan}
        </span>
        <Button
          size="sm"
          className="ml-auto"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await onStart([system])
              setRefusal(
                result.state === 'started' ? undefined : result.message,
              )
            })
          }
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
