import Link from 'next/link'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-end p-4">
        <ThemeToggle />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">next-base</h1>
        <p className="max-w-prose text-muted-foreground">
          A general-purpose Next.js base with a shadcn/ui design system, a
          light/dark/system theme, a generic data table, and a Storybook that
          showcases and verifies every component.
        </p>
        <Button asChild>
          <Link href="/dashboard">Open the app</Link>
        </Button>
      </div>
    </main>
  )
}
