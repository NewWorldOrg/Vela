import type { ComponentProps } from 'react'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'
import { ChevronLeftIcon } from '@/components/vela/icons'

/** The arrow back out of a screen pressed into, named for the screen it goes back to. */
export function PhoneBarBack({
  asChild,
  className,
  children,
  ...props
}: ComponentProps<'a'> & { asChild?: boolean; 'aria-label': string }) {
  const Comp = asChild ? Slot.Root : 'a'

  return (
    <Comp
      data-slot="phone-bar-back"
      className={cn(
        '-ml-3 flex size-11 shrink-0 items-center justify-center rounded-full text-ink no-underline outline-none',
        'focus-visible:shadow-ring [&_svg]:size-[calc(22rem/16)]',
        className,
      )}
      {...props}
    >
      <ChevronLeftIcon />
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  )
}
