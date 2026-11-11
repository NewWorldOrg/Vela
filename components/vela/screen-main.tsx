import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const SCREEN_WIDTHS = {
  default: cn(
    'mx-auto w-full max-w-full',
    'min-[1441px]:max-w-[1600px] min-[1920px]:max-w-[1760px]',
    'min-[2560px]:max-w-[calc(100vw-320px)]',
  ),
  full: 'w-full',
  reading: 'mx-auto w-full max-w-[calc(1260rem/16)]',
} as const

export type ScreenWidth = keyof typeof SCREEN_WIDTHS

export type ScreenScroll = 'page' | 'within'

export function ScreenMain({
  width = 'default',
  scroll = 'page',
  rises = true,
  className,
  ...props
}: ComponentProps<'main'> & {
  width?: ScreenWidth
  scroll?: ScreenScroll
  rises?: boolean
}) {
  return (
    <main
      data-slot="screen-main"
      data-width={width}
      data-scroll={scroll}
      className={cn(
        rises && 'screen-rises',
        'min-h-0 flex-1',
        'sideways:has-[[data-slot=sideways-panes]]:flex sideways:has-[[data-slot=sideways-panes]]:flex-col sideways:has-[[data-slot=sideways-panes]]:pb-0',
        SCREEN_WIDTHS[width],
        className,
      )}
      {...props}
    />
  )
}
