import { cn } from '@/lib/utils'

export const REACHED_BY_A_KEYBOARD =
  'cursor-help outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

export interface TipTrigger {
  tabIndex?: number
  className?: string
}

export function tipTrigger(
  className: string | undefined,
  alreadyFocusable: boolean,
): TipTrigger {
  if (alreadyFocusable) {
    return {}
  }

  return { tabIndex: 0, className: cn(className, REACHED_BY_A_KEYBOARD) }
}
