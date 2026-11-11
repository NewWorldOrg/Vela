'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/vela/spinner'
import {
  type PickingControls,
  whatItDoes,
} from '@/components/library/picked-actions'
import { PickedCount } from '@/components/library/picked-count'

const BAND_PRESS = 'h-[calc(38rem/16)] px-3 text-ui'

/** The band over a phone's tabs while a list is choosing: how many, every one, and the actions. The presses wrap under the count when the width has no room for them beside it. */
export function PickingBand({
  count,
  everyPicked,
  onEvery,
  actions,
  subject,
  className,
}: PickingControls & { className?: string }) {
  return (
    <div
      role="toolbar"
      aria-label={whatItDoes(subject)}
      data-slot="picking-band"
      className={cn(
        'fixed inset-x-0 bottom-[var(--tab-bar-cover)] z-50 flex min-h-[calc(60rem/16)] flex-wrap items-center gap-2 bg-bg py-2 pr-3 pl-[calc(18rem/16)] shadow-[0_-1px_0_var(--hair)] sideways:left-[calc(80rem/16+env(safe-area-inset-left))] sideways:pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      <PickedCount
        count={count}
        subject={subject}
        className="text-title font-semibold whitespace-nowrap"
        onABand
      />
      <span className="ml-auto flex flex-wrap justify-end gap-2">
        <Button variant="tone" className={BAND_PRESS} onClick={onEvery}>
          {everyPicked ? 'すべて外す' : 'すべて選ぶ'}
        </Button>
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            className={BAND_PRESS}
            disabled={action.pending || !action.enabled}
            onClick={action.onPress}
          >
            {action.pending ? <Spinner size="control" /> : action.icon}
            {action.short ?? action.label}
          </Button>
        ))}
      </span>
    </div>
  )
}
