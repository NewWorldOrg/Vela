import type { EncodeRemoved } from '@/repository/encode-terms'
import { REMOVAL_LABEL, RETIRED_LABEL } from '@/repository/encode-terms'
import { wordFor } from '@/lib/not-yet-in-this-build'
import { Badge } from '@/components/ui/badge'

export const STICKY_HEAD = '[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10'

export const RETIRED_ROW = '[&>td]:text-ink-2'

export function DefinitionName({
  label,
  retired,
  definedAt,
}: {
  label: string
  retired: boolean
  definedAt: string
}) {
  return (
    <span className="block">
      <span className="flex items-center gap-2">
        <b className="text-ui font-semibold">{label}</b>
        {retired && <Badge variant="mute">{RETIRED_LABEL}</Badge>}
      </span>
      <span
        data-slot="defined-at"
        className="block text-note tabular-nums text-ink-2"
      >
        作成 {definedAt}
      </span>
    </span>
  )
}

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
