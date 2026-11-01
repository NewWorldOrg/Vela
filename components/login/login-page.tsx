import {
  oidcStartHref,
  type IdentityProviderSignIn,
  type SignInOptions,
} from '@/repository/auth'
import { Button } from '@/components/ui/button'
import { Banner } from '@/components/vela/banner'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { SignInIcon } from '@/components/vela/icons'
import { VelaMark } from '@/components/vela/marks'
import {
  LocalSignIn,
  type LocalSignInPlacement,
} from '@/components/login/local-sign-in'

/** The ground of the screens outside the app: the plain page, the theme at its corner, one column at its middle. */
export const SIGN_IN_GROUND =
  'relative flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-16 max-[480px]:px-4 max-[480px]:pt-14 max-[480px]:pb-10'

/** The column of a screen outside the app, with nothing round it. */
export const SIGN_IN_COLUMN = 'w-full max-w-[calc(360rem/16)] text-center'

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
    <div className={SIGN_IN_GROUND}>
      <div className="absolute top-[calc(18rem/16)] right-[calc(22rem/16)]">
        <ThemeToggle />
      </div>
      <main className={SIGN_IN_COLUMN}>
        <VelaMark className="mx-auto size-11" />
        <h1 className="mt-3 mb-8 text-display-s font-bold text-ink">Vela</h1>
        {identityProviderFailed ? (
          <Banner tone="danger" className="mb-4 text-left">
            サインインに失敗しました。もう一度お試しください。
          </Banner>
        ) : (
          outOfReach && (
            <Banner tone="warn" className="mb-4 text-left">
              組織の ID プロバイダーに接続できません。
            </Banner>
          )
        )}
        {identityProvider && (
          <>
            <Button size="lg" className="w-full gap-2 text-body" asChild>
              <a href={oidcStartHref(returnPath)}>
                <SignInIcon className="size-4" />
                {identityProvider.providerName === null
                  ? 'SSO でサインイン'
                  : `${identityProvider.providerName} でサインイン`}
              </a>
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
