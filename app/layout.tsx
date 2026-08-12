import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { NO_FLASH_THEME_SCRIPT } from '@/components/theme/noFlashThemeScript'
import { Toaster } from '@/components/ui/sonner'

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
  const themeHeader = headerStore.get('x-theme-mode')
  const explicitMode: 'light' | 'dark' | null =
    themeHeader === 'dark' ? 'dark' : themeHeader === 'light' ? 'light' : null
  const initialPreference: 'light' | 'dark' | 'system' =
    explicitMode ?? 'system'

  return (
    <html
      lang="ja"
      className={explicitMode === 'dark' ? 'dark' : undefined}
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
          href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=M+PLUS+1+Code:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        {explicitMode === null && (
          // Injects a constant no-flash init script (no user input, no XSS risk).
          <script
            id="no-flash-theme-init"
            dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }}
          />
        )}
        <ThemeProvider initialPreference={initialPreference}>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
