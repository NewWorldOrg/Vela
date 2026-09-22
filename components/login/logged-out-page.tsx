import Link from 'next/link'

import type { AuthMethod } from '@/repository/auth'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { SignInIcon, SuccessIcon, VelaMark } from '@/components/vela/icons'

export function LoggedOutView({ method }: { method: AuthMethod }) {
  return (
    <div className="dot-grid relative flex min-h-dvh flex-col items-center justify-center bg-bg px-6 pt-[calc(60rem/16)] pb-[calc(60rem/16)] max-[480px]:px-4 max-[480px]:pt-14 max-[480px]:pb-10">
      <div className="absolute top-[calc(18rem/16)] right-[calc(22rem/16)]">
        <ThemeToggle />
      </div>
      <main className="w-full max-w-[calc(390rem/16)] rounded-xl border border-line-strong bg-surface px-8 pt-[calc(34rem/16)] pb-[calc(26rem/16)] text-center shadow-pop-xl max-[480px]:px-5 max-[480px]:pt-7 max-[480px]:pb-[calc(22rem/16)]">
        <VelaMark className="mx-auto mb-1.5 size-[calc(34rem/16)] text-brand" />
        <p className="heading text-[calc(23rem/16)] leading-[1.4] tracking-[0.02em]">
          Vela
        </p>
        <h1 className="heading mt-1 text-[calc(17rem/16)] leading-[1.5]">
          ログアウトしました
        </h1>
        <p className="mt-px mb-2 text-[calc(13rem/16)] text-ink-2">
          この端末のセッションを削除しました
        </p>
        <div className="mx-auto mb-[calc(18rem/16)] w-14 border-t border-dashed border-line-strong" />
        <div className="mb-4 flex items-start gap-[calc(9rem/16)] rounded-lg bg-mint-soft px-3.5 py-[calc(11rem/16)] text-left text-sub text-mint">
          <SuccessIcon className="mt-[calc(3rem/16)] size-4" />
          <span className="text-balance [word-break:auto-phrase]">
            ほかの端末はログインしたままです
          </span>
        </div>
        <Button
          size="lg"
          className="w-full gap-[calc(9rem/16)] text-body"
          asChild
        >
          <Link href="/login">
            <SignInIcon className="size-4" />
            もう一度ログイン
          </Link>
        </Button>
        {method === 'oidc' && (
          <p className="mt-[calc(15rem/16)] text-note leading-[1.7] text-ink-3">
            組織の ID プロバイダからはサインアウトしていません
          </p>
        )}
      </main>
    </div>
  )
}
