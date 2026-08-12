import type { Metadata } from 'next'

import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { PageHeading } from '@/components/vela/section-heading'
import { EmptyState } from '@/components/vela/empty-state'

export const metadata: Metadata = { title: '品質' }

export default function Page() {
  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>品質</CrumbCurrent>
      </Crumb>
      <PageHeading description="録画品質の常時計測。ドロップの発生状況とチューナーの健全性">
        品質
      </PageHeading>
      <EmptyState spot="tuner" className="mt-3.5">
        品質の画面はこれから実装されます。
      </EmptyState>
    </>
  )
}
