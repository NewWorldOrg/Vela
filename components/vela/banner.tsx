'use client'

import { useId, type ComponentProps } from 'react'
import type { Route } from 'next'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { still } from '@/components/vela/tactile'
import {
  DangerIcon,
  InfoIcon,
  SuccessIcon,
  WarningIcon,
} from '@/components/vela/icons'

export type BannerTone = 'info' | 'warn' | 'danger' | 'success'

export interface BannerLinkAction {
  label: string
  href?: Route
  onClick?: () => void
}

export interface BannerButtonAction {
  label: string
  control: 'button'
  disabled?: boolean
  onClick?: () => void
}

export type BannerAction = BannerLinkAction | BannerButtonAction

export type BannerActions =
  readonly [BannerAction] | readonly [BannerAction, BannerAction]

const ACTION_CLASS =
  'tap-target font-bold whitespace-nowrap text-inherit underline underline-offset-[3px]'

const DISABLED_ON_BAND: Record<BannerTone, string> = {
  info: 'border-sky-line bg-sky-soft text-sky hover:border-sky-line hover:bg-sky-soft',
  warn: 'border-lemon-line bg-lemon-soft text-lemon hover:border-lemon-line hover:bg-lemon-soft',
  danger:
    'border-coral-line bg-coral-soft text-coral hover:border-coral-line hover:bg-coral-soft',
  success:
    'border-mint-line bg-mint-soft text-mint hover:border-mint-line hover:bg-mint-soft',
}

const DISABLED_MOTION = cn(
  still,
  'shadow-pop-none hover:shadow-pop-none active:shadow-pop-none',
)

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
