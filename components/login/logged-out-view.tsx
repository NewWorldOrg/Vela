import Link from 'next/link'

import type { AuthMethod } from '@/repository/auth'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { SignInIcon, SuccessIcon } from '@/components/vela/icons'
import { VelaMark } from '@/components/vela/vela-mark'
import { SIGN_IN_COLUMN, SIGN_IN_GROUND } from '@/components/login/login-view'

export function LoggedOutView({ method }: { method: AuthMethod }) {
  return (
    <div className={SIGN_IN_GROUND}>
      <div className="absolute top-[calc(18rem/16)] right-[calc(22rem/16)]">
        <ThemeToggle />
      </div>
      <main className={SIGN_IN_COLUMN}>
        <VelaMark className="mx-auto size-11" />
        <h1 className="mt-3 text-display-s font-bold text-ink">
          サインアウトしました
        </h1>
        <p className="mt-2 text-body text-ink-2">
          この端末のセッションを削除しました。
        </p>
        <div className="mt-7 mb-4 flex items-center gap-3 rounded-lg bg-surface px-4 py-3.5 text-left text-body text-ink">
          <SuccessIcon className="size-[calc(17rem/16)] shrink-0 text-ink-2" />
          <span className="text-balance [word-break:auto-phrase]">
            ほかの端末はサインインしたままです
          </span>
        </div>
        <Button size="lg" className="w-full gap-2 text-body" asChild>
          <Link href="/login">
            <SignInIcon className="size-4" />
            サインインへ
          </Link>
        </Button>
        {method === 'oidc' && (
          <p className="mt-4 text-sub text-ink-2">
            組織の ID プロバイダーからはサインアウトしていません
          </p>
        )}
      </main>
    </div>
  )
}
