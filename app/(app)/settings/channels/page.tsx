import type { Metadata } from 'next'

import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { PageHeading } from '@/components/vela/section-heading'
import { EmptyState } from '@/components/vela/empty-state'

export const metadata: Metadata = { title: 'チャンネル' }

export default function Page() {
  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>チャンネル</CrumbCurrent>
      </Crumb>
      <PageHeading description="受信できるサービスと候補チャンネル。スキャンの結果は確認してから適用します">
        チャンネル
      </PageHeading>
      <EmptyState spot="antenna" className="mt-3.5">
        チャンネルの画面はこれから実装されます。
      </EmptyState>
    </>
  )
}
