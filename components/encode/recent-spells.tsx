import { formatLength } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { EncodeSpells } from '@/repository/encode'

const VALUE = 'font-code text-note tabular-nums text-ink-3'

export function RecentSpells({
  spells,
  className,
}: {
  spells: EncodeSpells
  className?: string
}) {
  return (
    <div
      data-slot="recent-spells"
      className={cn(
        'flex flex-wrap items-baseline gap-x-3.5 gap-y-1',
        className,
      )}
    >
      <span className="heading text-ui text-ink">直近の所要</span>
      {spells.averageSeconds === undefined ? (
        <span className="text-note text-ink-3">
          まだ {spells.fewestToAverage} 本に届いていません
        </span>
      ) : (
        <span className="font-code text-[15px] font-medium tabular-nums text-brand">
          平均 {formatLength(spells.averageSeconds)}
        </span>
      )}
      <span className={VALUE}>完了 {spells.jobs} 本</span>
      <span className={VALUE}>直近 {spells.lookedAtAtMost} 本まで</span>
      {spells.from && spells.to && (
        <span className={VALUE}>
          {spells.from} 〜 {spells.to}
        </span>
      )}
    </div>
  )
}
