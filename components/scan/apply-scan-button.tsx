'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useState, useTransition } from 'react'

import { signedOut } from '@/lib/signed-out'
import type { WriteResult } from '@/repository/services'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'

function refusalOf(result: WriteResult): string | undefined {
  if (result.state === 'unauthenticated') {
    return signedOut('保存')
  }

  return result.state === 'rejected' ? result.message : undefined
}

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
      <div className="flex flex-wrap items-center gap-[calc(9rem/16)]">
        <Button variant="ghost" asChild>
          <Link href={'/settings/channels' as Route}>キャンセル</Link>
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setRefusal(undefined)

              const result = await onApply(scanId)

              setRefusal(refusalOf(result))
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
