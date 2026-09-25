import {
  oidcStartHref,
  type IdentityProviderSignIn,
  type SignInOptions,
} from '@/repository/auth'
import { Button } from '@/components/ui/button'
import { Banner } from '@/components/vela/banner'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { SignInIcon, VelaMark } from '@/components/vela/icons'
import {
  LocalSignIn,
  type LocalSignInPlacement,
} from '@/components/login/local-sign-in'
import { IdentityProviderLink } from '@/components/login/identity-provider-link'

export function LoginView({
  returnPath,
  options,
  identityProviderFailed,
}: {
  returnPath: string
  options: SignInOptions
  identityProviderFailed: boolean
}) {
  const identityProvider: IdentityProviderSignIn | null =
    options.state === 'identity-provider' ? options : null
  const outOfReach: boolean =
    identityProvider !== null && !identityProvider.reachable

  return (
    <div className="dot-grid relative flex min-h-dvh flex-col items-center justify-center bg-bg px-6 pt-[calc(60rem/16)] pb-[calc(60rem/16)] max-[480px]:px-4 max-[480px]:pt-14 max-[480px]:pb-10">
      <div className="absolute top-[calc(18rem/16)] right-[calc(22rem/16)]">
        <ThemeToggle />
      </div>
      <main className="w-full max-w-[calc(390rem/16)] rounded-xl border border-line-strong bg-surface px-8 pt-[calc(34rem/16)] pb-[calc(26rem/16)] text-center shadow-pop-xl max-[480px]:px-5 max-[480px]:pt-7 max-[480px]:pb-[calc(22rem/16)]">
        <VelaMark className="mx-auto mb-1.5 size-[calc(34rem/16)] text-brand" />
        <h1 className="heading text-[calc(23rem/16)] leading-[1.4] tracking-[0.02em]">
          Vela
        </h1>
        <div className="mx-auto mt-2.5 mb-[calc(18rem/16)] w-14 border-t border-dashed border-line-strong" />
        {identityProviderFailed ? (
          <Banner
            tone="danger"
            className="mb-4 gap-[calc(9rem/16)] px-3.5 py-[calc(11rem/16)] text-left"
          >
            サインインに失敗しました。もう一度お試しください。
          </Banner>
        ) : (
          outOfReach && (
            <Banner
              tone="warn"
              className="mb-4 gap-[calc(9rem/16)] px-3.5 py-[calc(11rem/16)] text-left"
            >
              組織の ID プロバイダに接続できません。
            </Banner>
          )
        )}
        {identityProvider && (
          <>
            <Button
              size="lg"
              className="w-full gap-[calc(9rem/16)] text-body"
              asChild
            >
              <IdentityProviderLink href={oidcStartHref(returnPath)}>
                <SignInIcon className="size-4" />
                {identityProvider.providerName === null
                  ? 'SSO でサインイン'
                  : `${identityProvider.providerName} でサインイン`}
              </IdentityProviderLink>
            </Button>
          </>
        )}
        <LocalSignIn
          returnPath={returnPath}
          placement={placementOf(
            identityProvider !== null,
            identityProviderFailed || outOfReach,
          )}
        />
      </main>
    </div>
  )
}

function placementOf(
  identityProvider: boolean,
  fallenBack: boolean,
): LocalSignInPlacement {
  if (!identityProvider) {
    return 'lead'
  }

  return fallenBack ? 'expanded' : 'collapsed'
}
