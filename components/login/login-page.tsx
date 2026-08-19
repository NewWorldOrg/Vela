import { oidcStartHref } from '@/repository/auth'
import { Button } from '@/components/ui/button'
import { Banner } from '@/components/vela/banner'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { SignInIcon, VelaMark } from '@/components/vela/icons'
import { LocalSignIn } from '@/components/login/local-sign-in'

export function LoginView({
  returnPath,
  identityProviderFailed,
}: {
  returnPath: string
  identityProviderFailed: boolean
}) {
  return (
    <div className="dot-grid relative flex min-h-dvh flex-col items-center justify-center bg-bg px-6 pt-[60px] pb-[60px] max-[480px]:px-4 max-[480px]:pt-14 max-[480px]:pb-10">
      <div className="absolute top-[18px] right-[22px]">
        <ThemeToggle />
      </div>
      <main className="w-full max-w-[390px] rounded-xl border border-line-strong bg-surface px-8 pt-[34px] pb-[26px] text-center shadow-pop-xl max-[480px]:px-5 max-[480px]:pt-7 max-[480px]:pb-[22px]">
        <VelaMark className="mx-auto mb-1.5 size-[34px] text-brand" />
        <h1 className="heading text-[23px] leading-[1.4] tracking-[0.02em]">
          Vela
        </h1>
        <p className="mt-0.5 mb-2 text-[13px] text-ink-2">
          サインインして続行してください
        </p>
        <div className="mx-auto mb-[18px] w-14 border-t border-dashed border-line-strong" />
        {identityProviderFailed && (
          <Banner
            tone="danger"
            className="mb-4 gap-[9px] px-3.5 py-[11px] text-left"
          >
            サインインに失敗しました。もう一度お試しください
            <span className="mt-1 block">
              ID
              プロバイダに到達できないときは、ローカルアカウントでサインインできます
            </span>
          </Banner>
        )}
        <Button size="lg" className="w-full gap-[9px] text-[13.5px]" asChild>
          <a href={oidcStartHref(returnPath)}>
            <SignInIcon className="size-4" />
            SSO でサインイン
          </a>
        </Button>
        <p className="mt-[15px] text-note leading-[1.7] text-ink-3">
          認証は組織の ID プロバイダで行われます
        </p>
        <LocalSignIn
          returnPath={returnPath}
          defaultOpen={identityProviderFailed}
        />
      </main>
    </div>
  )
}
