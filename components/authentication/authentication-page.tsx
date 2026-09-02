import type {
  OidcConfig,
  OidcConfigChange,
  OidcSaveResult,
} from '@/repository/oidc'
import type {
  PasswordChange,
  PasswordResult,
  RevokeResult,
  SessionRow,
  SignedIn,
} from '@/repository/sessions'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { Banner } from '@/components/vela/banner'
import { EmptyState } from '@/components/vela/empty-state'
import { KeyIcon, MarkDevices } from '@/components/vela/icons'
import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import { OidcSettings } from '@/components/authentication/oidc-settings'
import { ChangePassword } from '@/components/authentication/password-change'
import { SessionTable } from '@/components/authentication/session-table'

/** What the last operation did, said once and left behind on the next visit. */
export type AuthenticationNotice =
  | { kind: 'revoked'; device: string }
  | { kind: 'password'; sessionsEnded: number }

export function AuthenticationView({
  sessions,
  signedIn,
  oidc,
  notice,
  onRevoke,
  onChangePassword,
  onSaveOidc,
}: {
  sessions: SessionRow[]
  signedIn: SignedIn
  oidc: OidcConfig
  notice?: AuthenticationNotice
  onRevoke: (id: string) => Promise<RevokeResult>
  onChangePassword: (change: PasswordChange) => Promise<PasswordResult>
  onSaveOidc: (change: OidcConfigChange) => Promise<OidcSaveResult>
}) {
  const others = sessions.filter((session) => !session.current)

  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>認証</CrumbCurrent>
      </Crumb>
      <PageHeading>認証</PageHeading>

      {oidc.reach === 'outOfReach' && (
        <Banner tone="danger" className="mt-3.5">
          ID プロバイダの discovery 文書を読めていないため、OIDC
          でのサインインは通りません。
        </Banner>
      )}

      <section className="mt-[26px]">
        <SectionHeading mark={KeyIcon}>ID プロバイダ(OIDC)</SectionHeading>
        <OidcSettings config={oidc} onSave={onSaveOidc} />
      </section>

      <section className="mt-[26px]">
        <SectionHeading mark={MarkDevices}>セッション</SectionHeading>

        {notice?.kind === 'revoked' && (
          <Banner tone="success" className="mb-3.5">
            {notice.device} のセッションを失効させました。
          </Banner>
        )}
        {notice?.kind === 'password' && (
          <Banner tone="success" className="mb-3.5">
            <b className="block font-bold">パスワードを変更しました。</b>
            ほかの端末のセッション {notice.sessionsEnded} 件を失効させました。
          </Banner>
        )}

        <div className="mb-3.5 flex justify-end">
          <ChangePassword
            username={
              signedIn.method === 'local' ? signedIn.subject : undefined
            }
            onChangePassword={onChangePassword}
          />
        </div>

        <SessionTable
          sessions={sessions}
          currentMethod={signedIn.method}
          onRevoke={onRevoke}
        />

        {others.length === 0 && (
          <EmptyState
            spot="device"
            title="ほかの端末のセッションはありません"
            className="mt-3.5"
          />
        )}
      </section>
    </>
  )
}
