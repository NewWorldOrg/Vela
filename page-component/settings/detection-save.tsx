'use client'

import { useState, useTransition } from 'react'

import type { TunerWriteResult } from '@/repository/tuners'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'

/**
 * The save the difference card offers. A refusal is stated beside the button —
 * the ledger is unchanged when one lands, so the card stays as it was.
 */
export function DetectionSave({
  onSave,
}: {
  onSave: () => Promise<TunerWriteResult>
}) {
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()

  return (
    <>
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setRefusal(undefined)

            const result = await onSave()

            setRefusal(
              result.state === 'unauthenticated'
                ? 'サインインが切れているため、保存できませんでした。サインインしてから開き直してください。'
                : result.state === 'rejected'
                  ? result.message
                  : undefined,
            )
          })
        }
      >
        この内容で保存
      </Button>
      <span aria-live="polite">
        {refusal && (
          <InlineAlert tone="warn" className="mt-2.5">
            {refusal}
          </InlineAlert>
        )}
      </span>
    </>
  )
}
