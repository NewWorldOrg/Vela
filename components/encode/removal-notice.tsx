import type { EncodeRemoved } from '@/repository/encode-terms'
import { REMOVAL_LABEL } from '@/repository/encode-terms'
import { wordFor } from '@/lib/not-yet-in-this-build'

export function RemovalNotice({
  removed,
}: {
  removed?: { label: string; removal: EncodeRemoved }
}) {
  return (
    <span aria-live="polite" className="mr-auto pl-1">
      {removed && (
        <span className="text-note text-ink">
          <b className="font-bold">{removed.label}</b> を
          {wordFor(REMOVAL_LABEL, removed.removal)}。
        </span>
      )}
    </span>
  )
}
