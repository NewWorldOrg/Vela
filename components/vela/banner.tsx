import type { ComponentProps } from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { DangerIcon, InfoIcon, WarningIcon } from '@/components/vela/icons'

export type BannerTone = 'info' | 'warn' | 'danger'

export interface BannerAction {
  label: string
  /** Without one the label is a button that carries no destination. */
  href?: Route
}

/** Two at most. A pair sits at the right edge in source order. */
export type BannerActions =
  readonly [BannerAction] | readonly [BannerAction, BannerAction]

const ACTION_CLASS =
  'font-bold whitespace-nowrap text-inherit underline underline-offset-[3px]'

const TONE_CLASS: Record<BannerTone, string> = {
  info: 'bg-sky-soft text-sky',
  warn: 'bg-lemon-soft text-lemon',
  danger: 'bg-coral-soft text-coral',
}

const TONE_ICON = {
  info: InfoIcon,
  warn: WarningIcon,
  danger: DangerIcon,
}

function BannerActionLabel({ action }: { action: BannerAction }) {
  return action.href ? (
    <Link href={action.href} className={ACTION_CLASS}>
      {action.label}
    </Link>
  ) : (
    <button type="button" className={ACTION_CLASS}>
      {action.label}
    </button>
  )
}

/**
 * The banner at the top of a page. One at a time: when several things happen
 * at once, keep the most severe and reduce the rest to a count. No border and
 * no blinking — the soft colour surface plus an icon carries it.
 *
 * An action is a bold, permanently underlined text link in the band's own
 * colour — never a button shape, since a colour surface carries neither border
 * nor shadow. There is no unavailable state: an action that cannot be taken is
 * left out and the body says why.
 */
export function Banner({
  tone = 'info',
  actions,
  progress,
  className,
  children,
  ...props
}: ComponentProps<'div'> & {
  tone?: BannerTone
  actions?: BannerActions
  /** 0–100. Renders the static progress track under the message. */
  progress?: number
}) {
  const ToneIcon = TONE_ICON[tone]

  return (
    <div
      data-slot="banner"
      data-tone={tone}
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-[11px] rounded-lg px-[15px] py-3 text-ui',
        TONE_CLASS[tone],
        className,
      )}
      {...props}
    >
      <ToneIcon className="mt-[3px] size-[17px]" />
      <div className="min-w-0 flex-1">
        {children}
        {progress !== undefined && (
          <div className="mt-[9px] h-1 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-current transition-[width] duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      {actions && (
        <div className="ml-auto flex shrink-0 gap-[14px] pl-[14px] text-ui">
          {actions.map((action) => (
            <BannerActionLabel key={action.label} action={action} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * The small alert that sits directly under the field it is about. Never used
 * together with a page banner.
 */
export function InlineAlert({
  tone = 'warn',
  className,
  children,
  ...props
}: ComponentProps<'div'> & { tone?: Exclude<BannerTone, 'info'> }) {
  const ToneIcon = TONE_ICON[tone]

  return (
    <div
      data-slot="inline-alert"
      data-tone={tone}
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-[9px] rounded-md px-3 py-2 text-sub',
        TONE_CLASS[tone],
        className,
      )}
      {...props}
    >
      <ToneIcon className="mt-[3px] size-[15px]" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
