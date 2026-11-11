'use client'

import { Button } from '@/components/ui/button'
import { EditIcon } from '@/components/vela/icons'

export function ChangeButton({
  label,
  onOpen,
}: {
  label: string
  onOpen: () => void
}) {
  return (
    <Button
      variant="tone"
      size="sm"
      aria-label={`${label} を変更`}
      onClick={onOpen}
    >
      <EditIcon />
      変更
    </Button>
  )
}
