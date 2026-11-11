'use client'

import { useState } from 'react'

import type { NotificationWrite } from '@/lib/notifications'
import { Button } from '@/components/ui/button'
import { RemoveDialog } from '@/components/notifications/remove-dialog'

/** `削除` with its question, where it stands as a button of its own. */
export function RemoveButton({
  what,
  name,
  onRemove,
  onRemoved,
}: {
  what: '送り先' | 'ルールセット'
  name: string
  onRemove: () => Promise<NotificationWrite>
  onRemoved?: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="danger"
        aria-label={`${name} を削除`}
        onClick={() => setOpen(true)}
      >
        削除
      </Button>
      <RemoveDialog
        what={what}
        name={name}
        open={open}
        onOpenChange={setOpen}
        onRemove={onRemove}
        onRemoved={onRemoved}
      />
    </>
  )
}
