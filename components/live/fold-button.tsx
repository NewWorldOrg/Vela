'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/vela/icons'

export function FoldButton({
  folded,
  onFold,
  controls,
  label = 'チャンネル一覧',
}: {
  folded: boolean
  onFold: (folded: boolean) => void
  controls?: string
  label?: string
}) {
  return (
    <Button
      type="button"
      variant="tone"
      size="icon"
      aria-label={label}
      aria-expanded={!folded}
      aria-controls={controls}
      onClick={() => onFold(!folded)}
      className="pointer-events-auto"
    >
      {folded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </Button>
  )
}
