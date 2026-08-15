'use client'

import { useTransition } from 'react'

import { Button } from '@/components/ui/button'

/**
 * Applying is the one moment the proposal becomes the definition. It is one
 * press, it covers the whole run, and it stays pressed out while it runs so it
 * cannot be sent twice.
 */
export function ApplyScanButton({
  scanId,
  disabled,
  onApply,
}: {
  scanId: string
  disabled?: boolean
  onApply: (scanId: string) => Promise<void>
}) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      size="sm"
      disabled={pending || disabled}
      title={disabled ? '保存する変更がありません' : undefined}
      onClick={() =>
        startTransition(async () => {
          await onApply(scanId)
        })
      }
    >
      この内容で保存
    </Button>
  )
}
