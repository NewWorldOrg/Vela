'use client'

import { useState, useTransition } from 'react'

import type { SweepWrite } from '@/repository/integrity'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/vela/banner'
import { SearchIcon } from '@/components/vela/icons'

export function RunCheckButton({
  onRun,
}: {
  onRun: () => Promise<SweepWrite>
}) {
  const [pending, startTransition] = useTransition()
  const [refusal, setRefusal] = useState<string>()
  const [found, setFound] = useState<number>()

  return (
    <>
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setRefusal(undefined)
            setFound(undefined)

            const result = await onRun()

            if (result.state === 'refused') {
              setRefusal(result.message)

              return
            }

            setFound(result.findings)
          })
        }
      >
        <SearchIcon />
        いま実行する
      </Button>
      {(refusal !== undefined || found !== undefined) && (
        <span aria-live="polite" className="mt-2 block basis-full">
          {refusal !== undefined ? (
            <InlineAlert tone="warn">{refusal}</InlineAlert>
          ) : (
            <span className="block text-note leading-relaxed text-mint">
              整合性チェックが終わりました。{found} 件見つかっています。
            </span>
          )}
        </span>
      )}
    </>
  )
}
