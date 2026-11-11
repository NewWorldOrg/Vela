'use client'

import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export const CHOICE_LABEL =
  'text-sub font-semibold whitespace-nowrap text-ink-2'

export function ChoiceLabel({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn(CHOICE_LABEL, className)} {...props} />
}
