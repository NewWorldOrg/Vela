'use client'

import { useState, useTransition } from 'react'

import type { TunerWriteResult } from '@/repository/tuners'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'

export function DetectionSave({
  devices,
  onSave,
}: {
  devices: string[]
  onSave: (devices: string[]) => Promise<TunerWriteResult>
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

            const result = await onSave(devices)

            setRefusal(
              result.state === 'unauthenticated'
                ? 'サインインが切れているため、保存できませんでした。'
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
