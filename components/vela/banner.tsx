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
  'tap-target font-semibold whitespace-nowrap text-acc-text underline-offset-[3px] hover:underline'

const DISABLED_MOTION = cn(still, 'opacity-40 hover:opacity-40')

/** A notice sits on the quiet face like any group; only its sign wears the colour of what it says. */
const TONE_SIGN: Record<BannerTone, string> = {
  info: 'text-ink-2',
  warn: 'text-warn',
  danger: 'text-rec',
  success: 'text-ink-2',
}

export const TONE_ICON = {
  info: InfoIcon,
  warn: WarningIcon,
  danger: DangerIcon,
  success: SuccessIcon,
}

function BannerActionControl({
  action,
  bodyId,
}: {
  action: BannerAction
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
        className={cn(action.disabled && DISABLED_MOTION)}
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
        'flex items-start gap-3 rounded-lg bg-surface px-4 py-3.5 text-body text-ink',
        className,
      )}
      {...props}
    >
      <ToneIcon
        className={cn('mt-0.5 size-[calc(17rem/16)] shrink-0', TONE_SIGN[tone])}
      />
      <div id={bodyId} className="min-w-0 flex-1">
        {children}
        {progress !== undefined && (
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      {actions && (
        <div className="ml-auto flex shrink-0 items-center gap-3.5 self-center pl-3.5 text-ui">
          {actions.map((action) => (
            <BannerActionControl
              key={action.label}
              action={action}
              bodyId={bodyId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
