import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { NO_FLASH_THEME_SCRIPT } from '@/components/theme/noFlashThemeScript'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: {
    template: '%s | next-base',
    default: 'next-base',
  },
  description: 'A general-purpose Next.js development base.',
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
      lang="en"
      className={explicitMode === 'dark' ? 'dark' : undefined}
      suppressHydrationWarning
    >
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
