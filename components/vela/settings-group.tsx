import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export const SETTINGS_GROUP_TITLE =
  'mx-4 mt-[calc(26rem/16)] mb-2 text-sub font-semibold text-ink-2'

const SWITCH_OFF_ON_THE_GROUP =
  '[&_[data-slot=switch][data-state=unchecked]]:bg-[color-mix(in_srgb,var(--ink)_17%,var(--surface))]'

export function SettingsGroup({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="settings-group"
      className={cn(
        'overflow-hidden rounded-lg bg-surface',
        SWITCH_OFF_ON_THE_GROUP,
        className,
      )}
      {...props}
    />
  )
}

export function SettingsRow({
  name,
  className,
  children,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  name: ReactNode
  children?: ReactNode
}) {
  return (
    <div
      data-slot="settings-row"
      className={cn(
        'relative flex min-h-14 items-center gap-4 px-4 py-2',
        'before:absolute before:top-0 before:right-0 before:left-4 before:h-px before:bg-hair first:before:hidden',
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1 text-[calc(14.5rem/16)] leading-5 font-medium text-ink">
        {name}
      </div>
      {children !== undefined && (
        <div className="flex min-w-0 shrink-0 items-center gap-2 text-body text-ink-2 tabular-nums">
          {children}
        </div>
      )}
    </div>
  )
}
