import type { EncodeRemoved } from '@/repository/encode-terms'
import { REMOVAL_LABEL, RETIRED_LABEL } from '@/repository/encode-terms'
import { Badge } from '@/components/ui/badge'

export const STICKY_HEAD = '[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10'

export const STAMP =
  'font-code text-sub tabular-nums whitespace-nowrap text-ink-2'

export const RETIRED_ROW = '[&>td]:bg-surface-2'

export const ROW_OPS = 'inline-flex items-center gap-2'

export function DefinitionName({
  label,
  retired,
}: {
  label: string
  retired: boolean
}) {
  return (
    <span className="flex items-center gap-2">
      <b className="text-[13px] font-bold">{label}</b>
      {retired && <Badge variant="mute">{RETIRED_LABEL}</Badge>}
    </span>
  )
}

export function RemovalNotice({
  removed,
}: {
  removed?: { label: string; removal: EncodeRemoved }
}) {
  return (
    <span aria-live="polite" className="mr-auto">
      {removed && (
        <span className="text-note text-mint">
          <b className="font-bold">{removed.label}</b> を
          {REMOVAL_LABEL[removed.removal]}。
        </span>
      )}
    </span>
  )
}
