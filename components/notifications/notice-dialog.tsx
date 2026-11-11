'use client'

import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IconButton } from '@/components/vela/icon-button'
import { ChevronLeftIcon } from '@/components/vela/icons'
import { FieldLabel } from '@/components/vela/field'

/** On a phone held upright the dialog is a sheet that rises from the foot of the window, square at the bottom. */
const SHEET_ON_A_PHONE = cn(
  'upright:top-auto upright:bottom-0 upright:left-0 upright:w-full upright:max-w-none upright:translate-x-0 upright:translate-y-0',
  'upright:max-h-[90dvh] upright:rounded-t-xl upright:rounded-b-none upright:px-4 upright:pt-[calc(18rem/16)] upright:pb-9',
  'upright:[--from-scale:1] upright:[--from-y:24px]',
)

export function NoticeDialogContent({
  className,
  ...props
}: ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      onInteractOutside={(event) => event.preventDefault()}
      className={cn(SHEET_ON_A_PHONE, className)}
      {...props}
    />
  )
}

/** The title row: a way back to the step before when there is one, then the title. The close button is the dialog's own. */
export function NoticeDialogHeader({
  title,
  description,
  onBack,
}: {
  title: string
  description: string
  onBack?: () => void
}) {
  return (
    <DialogHeader className="min-h-[calc(34rem/16)] flex-row items-center gap-1 pr-10 text-left">
      {onBack && (
        <IconButton
          variant="quiet"
          aria-label="戻る"
          onClick={onBack}
          className="-ml-2 text-ink"
        >
          <ChevronLeftIcon className="size-[calc(18rem/16)]" />
        </IconButton>
      )}
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription className="sr-only">{description}</DialogDescription>
    </DialogHeader>
  )
}

/** The buttons at a dialog's foot, in the middle as every dialog has them; stacked the width of the sheet on a phone, the main one on top. */
export function NoticeDialogFooter({ children }: { children: ReactNode }) {
  return (
    <DialogFooter className="mt-1.5 upright:[&_[data-slot=button]]:h-11">
      {children}
    </DialogFooter>
  )
}

/** A field's name over it, small and quiet, as the rule editor writes it. */
export function NoticeLabel({
  className,
  ...props
}: ComponentProps<typeof FieldLabel>) {
  return (
    <FieldLabel
      className={cn('text-sub font-semibold text-ink-2', className)}
      {...props}
    />
  )
}

export function NoticeGroupLabel({
  className,
  ...props
}: ComponentProps<'span'>) {
  return (
    <span
      className={cn('text-sub font-semibold text-ink-2', className)}
      {...props}
    />
  )
}
