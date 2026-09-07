'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useState, useTransition } from 'react'

import type { WriteResult } from '@/repository/services'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'

export function ApplyScanAction({
  scanId,
  onApply,
}: {
  scanId: string
  onApply: (scanId: string) => Promise<WriteResult>
}) {
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()

  return (
    <>
      <div className="flex flex-wrap items-center gap-[9px]">
        <Button variant="ghost" size="sm" asChild>
          <Link href={'/settings/channels' as Route}>破棄</Link>
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setRefusal(undefined)

              const result = await onApply(scanId)

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
      </div>
      <span aria-live="polite" className="basis-full">
        {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
      </span>
    </>
  )
}
