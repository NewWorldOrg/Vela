'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useState, useTransition } from 'react'

import type { WriteResult } from '@/repository/services'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'

/**
 * The decision the page exists for: discard, or apply the whole run. Applying
 * is one press and it stays pressed out while it runs, so it cannot be sent
 * twice. A refusal is stated on its own line — the difference the API holds
 * can be gone by the time the press lands, and the definitions are then
 * exactly as they were.
 */
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
      </div>
      <span aria-live="polite" className="basis-full">
        {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
      </span>
    </>
  )
}
