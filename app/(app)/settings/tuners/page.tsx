import type { Metadata } from 'next'

import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { PageHeading } from '@/components/vela/section-heading'
import { EmptyState } from '@/components/vela/empty-state'

export const metadata: Metadata = { title: 'チューナー' }

export default function Page() {
  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>チューナー</CrumbCurrent>
      </Crumb>
      <PageHeading description="接続されたチューナーデバイスの台帳と稼働状態">
        チューナー
      </PageHeading>
      <EmptyState spot="tuner" className="mt-3.5">
        チューナーの画面はこれから実装されます。
      </EmptyState>
    </>
  )
}
