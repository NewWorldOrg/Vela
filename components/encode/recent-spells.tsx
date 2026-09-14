import { formatLength } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { EncodeSpells } from '@/repository/encode'

const SENTENCE = 'text-note tabular-nums text-ink-3'

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
        <span className={SENTENCE}>
          完了 {spells.jobs} 本。まだ {spells.fewestToAverage}{' '}
          本に届いていません
        </span>
      ) : (
        <span className={SENTENCE}>
          完了 {spells.jobs} 本の平均{' '}
          <span className="font-code text-[15px] font-medium tabular-nums text-brand">
            {formatLength(spells.averageSeconds)}
          </span>
        </span>
      )}
      {spells.from && spells.to && (
        <span className="font-code text-note tabular-nums text-ink-3">
          {spells.from} 〜 {spells.to}
        </span>
      )}
    </div>
  )
}
