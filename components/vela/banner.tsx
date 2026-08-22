'use client'

import { useId, type ComponentProps } from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DangerIcon,
  InfoIcon,
  SuccessIcon,
  WarningIcon,
} from '@/components/vela/icons'

export type BannerTone = 'info' | 'warn' | 'danger' | 'success'

/** A navigation. Renders as a bold, permanently underlined text link. */
export interface BannerLinkAction {
  label: string
  /** Without one the label is a button, and `onClick` carries it instead. */
  href?: Route
  onClick?: () => void
}

/**
 * A state-changing operation. Renders as a real Button — the colour-surface
 * rule applies to the band, not to a control in its action slot. While
 * unavailable it stays visible, disabled in the band's own colours, and the
 * body carries the reason and when it becomes available.
 */
export interface BannerButtonAction {
  label: string
  control: 'button'
  disabled?: boolean
  onClick?: () => void
}

export type BannerAction = BannerLinkAction | BannerButtonAction

/** Two at most. A pair sits at the right edge in source order. */
export type BannerActions =
  readonly [BannerAction] | readonly [BannerAction, BannerAction]

const ACTION_CLASS =
  'tap-target font-bold whitespace-nowrap text-inherit underline underline-offset-[3px]'

/**
 * Disabled on a band is the same button switched off, drawn from the band's
 * own palette — fill = the band's soft token, border = its line token, text =
 * its state colour, no shadow, no motion. Never the default grey disabled
 * look, which reads as a foreign object on a tint.
 */
const DISABLED_ON_BAND: Record<BannerTone, string> = {
  info: 'border-sky-line bg-sky-soft text-sky hover:border-sky-line hover:bg-sky-soft',
  warn: 'border-lemon-line bg-lemon-soft text-lemon hover:border-lemon-line hover:bg-lemon-soft',
  danger:
    'border-coral-line bg-coral-soft text-coral hover:border-coral-line hover:bg-coral-soft',
  success:
    'border-mint-line bg-mint-soft text-mint hover:border-mint-line hover:bg-mint-soft',
}

const DISABLED_MOTION =
  'cursor-not-allowed shadow-pop-none hover:shadow-pop-none active:shadow-pop-none hover:translate-x-0 hover:translate-y-0 active:translate-x-0 active:translate-y-0'

const TONE_CLASS: Record<BannerTone, string> = {
  info: 'bg-sky-soft text-sky',
  warn: 'bg-lemon-soft text-lemon',
  danger: 'bg-coral-soft text-coral',
  success: 'bg-mint-soft text-mint',
}

const TONE_ICON = {
  info: InfoIcon,
  warn: WarningIcon,
  danger: DangerIcon,
  success: SuccessIcon,
}

function BannerActionControl({
  action,
  tone,
  bodyId,
}: {
  action: BannerAction
  tone: BannerTone
  bodyId: string
}) {
  if ('control' in action) {
    return (
      <Button
        size="sm"
        aria-disabled={action.disabled || undefined}
        aria-describedby={action.disabled ? bodyId : undefined}
        onClick={
          action.disabled
            ? (event) => {
                event.preventDefault()
                event.stopPropagation()
              }
            : action.onClick
        }
        className={cn(
          action.disabled && [DISABLED_ON_BAND[tone], DISABLED_MOTION],
        )}
      >
        {action.label}
      </Button>
    )
  }

  return action.href ? (
    <Link href={action.href} className={ACTION_CLASS}>
      {action.label}
    </Link>
  ) : (
    <button
      type="button"
      onClick={action.onClick}
      className={cn(ACTION_CLASS, 'cursor-pointer')}
    >
      {action.label}
    </button>
  )
}

/**
 * The banner at the top of a page. One at a time: when several things happen
 * at once, keep the most severe and reduce the rest to a count. No border and
 * no blinking — the soft colour surface plus an icon carries it.
 *
 * A navigation action is a bold, permanently underlined text link in the
 * band's own colour. A state-changing action is a real Button, at most one per
 * banner; while unavailable it stays visible, disabled in the band's colours,
 * with the reason in the body.
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
  const bodyId = useId()

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
      <div id={bodyId} className="min-w-0 flex-1">
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
        <div className="ml-auto flex shrink-0 items-center gap-[14px] self-center pl-[14px] text-ui">
          {actions.map((action) => (
            <BannerActionControl
              key={action.label}
              action={action}
              tone={tone}
              bodyId={bodyId}
            />
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
}: ComponentProps<'div'> & { tone?: Exclude<BannerTone, 'info' | 'success'> }) {
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
