import Link from 'next/link'

import type { AuthMethod } from '@/repository/auth'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { SignInIcon, SuccessIcon, VelaMark } from '@/components/vela/icons'

export function LoggedOutView({ method }: { method: AuthMethod }) {
  return (
    <div className="dot-grid relative flex min-h-dvh flex-col items-center justify-center bg-bg px-6 pt-[60px] pb-[60px] max-[480px]:px-4 max-[480px]:pt-14 max-[480px]:pb-10">
      <div className="absolute top-[18px] right-[22px]">
        <ThemeToggle />
      </div>
      <main className="w-full max-w-[390px] rounded-xl border border-line-strong bg-surface px-8 pt-[34px] pb-[26px] text-center shadow-pop-xl max-[480px]:px-5 max-[480px]:pt-7 max-[480px]:pb-[22px]">
        <VelaMark className="mx-auto mb-1.5 size-[34px] text-brand" />
        <p className="heading text-[23px] leading-[1.4] tracking-[0.02em]">
          Vela
        </p>
        <h1 className="heading mt-1 text-[17px] leading-[1.5]">
          ログアウトしました
        </h1>
        <p className="mt-px mb-2 text-[13px] text-ink-2">
          この端末のセッションを削除しました
        </p>
        <div className="mx-auto mb-[18px] w-14 border-t border-dashed border-line-strong" />
        <div className="mb-4 flex items-start gap-[9px] rounded-lg bg-mint-soft px-3.5 py-[11px] text-left text-sub text-mint">
          <SuccessIcon className="mt-[3px] size-4" />
          <span className="text-balance">
            ほかの端末のセッションはそのまま残っています
          </span>
        </div>
        <Button size="lg" className="w-full gap-[9px] text-[13.5px]" asChild>
          <Link href="/login">
            <SignInIcon className="size-4" />
            もう一度ログイン
          </Link>
        </Button>
        <p className="mt-[15px] text-note leading-[1.7] text-ink-3">
          {method === 'oidc'
            ? '組織の ID プロバイダからはサインアウトしていません'
            : 'ローカルアカウントでサインインします'}
        </p>
      </main>
    </div>
  )
}
