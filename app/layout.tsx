import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { MOTION_HEADER, motionOf } from '@/lib/motion'
import { THEME_HEADER, themeOf } from '@/lib/theme'

export const metadata: Metadata = {
  title: {
    template: '%s | Vela',
    default: 'Vela',
  },
  description: '録画システムのフロントエンド',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headerStore = await headers()
  const initialPreference = themeOf(headerStore.get(THEME_HEADER))
  const motion = motionOf(headerStore.get(MOTION_HEADER))

  return (
    <html
      lang="ja"
      className={
        initialPreference === 'dark'
          ? 'dark'
          : initialPreference === 'system'
            ? 'system'
            : undefined
      }
      data-motion={motion}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=M+PLUS+1+Code:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider initialPreference={initialPreference}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
