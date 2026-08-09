import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Brand } from '@/components/vela/app-shell'

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-line bg-surface px-[14px] py-2">
        <Brand />
        <ThemeToggle />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="heading text-h1">Vela</h1>
        <p className="max-w-prose text-ui text-ink-2">
          録画システムのフロントエンド。画面の実装はこれから、デザインシステムは
          Storybook にあります。
        </p>
      </div>
    </main>
  )
}
