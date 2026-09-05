'use client'

import { useState, useTransition } from 'react'

import type { EncodeWrite } from '@/repository/encode'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/vela/progress'

export function CancelJobButton({
  id,
  onCallOff,
}: {
  id: string
  onCallOff: (id: string) => Promise<EncodeWrite>
}) {
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()

  const callOff = () => {
    if (pending) {
      return
    }

    startTransition(async () => {
      setRefusal(undefined)

      const result = await onCallOff(id)

      if (result.state === 'rejected') {
        setRefusal(result.message)
      }

      if (result.state === 'unauthenticated') {
        setRefusal('サインインが切れているため、中止できませんでした。')
      }
    })
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-disabled={pending}
        onClick={callOff}
      >
        {pending && <Spinner className="size-3.5" />}
        中止
      </Button>
      {refusal && (
        <span role="status" className="text-note text-coral">
          {refusal}
        </span>
      )}
    </span>
  )
}
