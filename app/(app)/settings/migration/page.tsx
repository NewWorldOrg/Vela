import type { Metadata } from 'next'

import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { PageHeading } from '@/components/vela/section-heading'
import { EmptyState } from '@/components/vela/empty-state'

export const metadata: Metadata = { title: '移行記録' }

export default function Page() {
  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>移行記録</CrumbCurrent>
      </Crumb>
      <PageHeading description="移行で何が運ばれ、何が運ばれなかったかを、いつでも言えるようにするための記録です。処理は一度きりですが、記録は恒久に残ります">
        移行記録
      </PageHeading>
      <EmptyState spot="tape" className="mt-3.5">
        移行記録の画面はこれから実装されます。
      </EmptyState>
    </>
  )
}
