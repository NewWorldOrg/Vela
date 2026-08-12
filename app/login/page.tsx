import type { Metadata } from 'next'

import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { InfoIcon, SignInIcon, VelaMark } from '@/components/vela/icons'

export const metadata: Metadata = { title: 'サインイン' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const failed = typeof params.error === 'string'

  return (
    <div className="dot-grid relative flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-[60px]">
      <div className="absolute top-[18px] right-[22px]">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[390px] rounded-xl border border-line-strong bg-surface px-8 pt-[34px] pb-[26px] text-center shadow-pop-xl max-[480px]:px-5 max-[480px]:pt-7 max-[480px]:pb-[22px]">
        <VelaMark className="mx-auto mb-1.5 size-[34px] text-brand" />
        <div className="heading text-[23px] leading-[1.4] tracking-[0.02em]">
          Vela
        </div>
        <p className="mt-0.5 mb-2 text-[13px] text-ink-2">
          サインインして続行してください
        </p>
        <div className="mx-auto mb-[18px] w-14 border-t border-dashed border-line-strong" />
        {failed && (
          <p className="mb-4 flex items-start gap-[9px] rounded-lg bg-coral-soft px-3.5 py-[11px] text-left text-ui leading-[1.7] text-coral">
            <InfoIcon className="mt-[3px] size-4 shrink-0" />
            <span className="[text-wrap:balance]">
              サインインに失敗しました。もう一度お試しください
            </span>
          </p>
        )}
        <button
          type="button"
          disabled
          title="サインインはこれから実装されます"
          className="flex w-full cursor-pointer items-center justify-center gap-[9px] rounded-full border border-accent bg-btn-fill px-4 py-[11px] text-[13.5px] font-bold text-on-btn shadow-pop transition-[translate,box-shadow,background-color] duration-150 ease-toy hover:bg-btn-fill-hover hover:shadow-pop-lg hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px active:shadow-pop-none focus-visible:shadow-pop-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:border-dashed disabled:border-line disabled:bg-surface-2 disabled:text-ink-3 disabled:shadow-pop-none [&_svg]:transition-transform [&_svg]:duration-150 [&_svg]:ease-toy hover:[&_svg]:-rotate-6 hover:[&_svg]:scale-110"
        >
          <SignInIcon className="size-4" />
          SSO でサインイン
        </button>
        <p className="mt-[15px] text-note leading-[1.7] text-ink-3">
          認証は組織の ID プロバイダで行われます
        </p>
      </div>
    </div>
  )
}
