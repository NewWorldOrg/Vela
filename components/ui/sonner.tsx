'use client'

import {
  DangerIcon,
  InfoIcon,
  SuccessIcon,
  WarningIcon,
} from '@/components/vela/icons'
import { Spinner } from '@/components/vela/progress'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useTheme } from '@/components/theme/ThemeProvider'

const Toaster = ({ ...props }: ToasterProps) => {
  // Follow the app's resolved theme (light/dark) instead of next-themes.
  const { mode } = useTheme()

  return (
    <Sonner
      theme={mode}
      className="toaster group"
      icons={{
        success: <SuccessIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <WarningIcon className="size-4" />,
        error: <DangerIcon className="size-4" />,
        loading: <Spinner className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
