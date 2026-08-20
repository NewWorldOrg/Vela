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
import {
  ClockIcon,
  InfoIcon,
  KeyIcon,
  ListIcon,
  MarkDevices,
} from '@/components/vela/icons'
import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import { TintPanel } from '@/components/vela/surface'
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
      <PageHeading description="サインインの方法とセッションを管理します。ローカルアカウントは常に使えて、OIDC は必要なときに追加します。">
        認証
      </PageHeading>

      {oidc.reach === 'outOfReach' && (
        <Banner tone="danger" className="mt-3.5">
          <b className="font-bold">
            ID プロバイダの discovery 文書を読めていないため、OIDC
            でのサインインは通りません。
          </b>
          ローカルアカウントでのサインインはそのまま使えます。discovery URL と
          ID プロバイダ側の状態を確かめてください。
        </Banner>
      )}

      <TintPanel
        tint="sky"
        className="mt-3.5 flex items-start gap-[11px] text-ui leading-[1.75]"
      >
        <InfoIcon className="mt-[3px] size-[17px] shrink-0 text-sky" />
        <div>
          <b className="font-bold">セッションは端末ごとに記録しています。</b>
          だから、いま使っている端末を残したまま、ほかの端末だけをログアウトさせられます。
        </div>
      </TintPanel>

      <section className="mt-[26px]">
        <SectionHeading mark={KeyIcon}>ID プロバイダ(OIDC)</SectionHeading>
        <p className="mb-3.5 text-sub text-ink-2">
          任意です。設定しなければローカルアカウントだけで運用します
        </p>
        <OidcSettings config={oidc} onSave={onSaveOidc} />
      </section>

      <section className="mt-[26px]">
        <SectionHeading mark={MarkDevices}>セッション</SectionHeading>
        <p className="mb-3.5 text-sub text-ink-2">
          いまサインインしている端末の一覧。端末表示名は User-Agent から作ります
        </p>

        {notice?.kind === 'revoked' && (
          <Banner tone="success" className="mb-3.5">
            <b className="font-bold">
              {notice.device} のセッションを失効させました。
            </b>
            この端末は次のリクエストから API / SSE / TS で 401
            になります。すでに張られている長時間接続(SSE / TS)は接続確立時に 1
            回だけ判定しているため、既定では次回接続で弾かれます。
          </Banner>
        )}
        {notice?.kind === 'password' && (
          <Banner tone="success" className="mb-3.5">
            <b className="font-bold">パスワードを変更しました。</b>
            ほかの端末のセッション {notice.sessionsEnded}{' '}
            件を失効させました。いまの端末はそのまま使えます。
          </Banner>
        )}

        <TintPanel
          tint="butter"
          className="mb-3.5 flex flex-wrap items-start gap-3 text-ui leading-[1.75]"
        >
          <div className="min-w-[220px] flex-1">
            <b className="font-bold">
              まとめてログアウトさせたいときは、パスワードを変更します。
            </b>
            ローカルアカウントのパスワードを変えると、いま使っている端末以外がログアウトされます。
          </div>
          <div className="ml-auto self-center">
            <ChangePassword
              username={
                signedIn.method === 'local' ? signedIn.subject : undefined
              }
              onChangePassword={onChangePassword}
            />
          </div>
        </TintPanel>

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
          >
            いまの端末のほかにサインインしている端末はありません。別の端末でサインインすると、端末表示名・認証方式・最終利用がここに並び、1
            台ずつ失効させられます。
          </EmptyState>
        )}

        <div className="mt-3.5 flex flex-col gap-[7px] border-t border-dashed border-line pt-3 text-note leading-[1.7] text-ink-2">
          <p className="flex items-start gap-2.5">
            <ClockIcon className="mt-[3px] size-3.5 shrink-0 text-ink-3" />
            <span>
              <b className="font-bold text-ink">
                有効期限は絶対期限とアイドル期限で決まり、いずれも設定値です。
              </b>
              期限を過ぎたセッションはこの一覧から消えます。
            </span>
          </p>
          <p className="flex items-start gap-2.5">
            <ListIcon className="mt-[3px] size-3.5 shrink-0 text-ink-3" />
            <span>
              最終利用の記録は書き込みが集中しないよう間引いています(閾値は設定値)。表示には数分の粗さが含まれます。
            </span>
          </p>
        </div>
      </section>
    </>
  )
}
