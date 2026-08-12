import type { Metadata } from 'next'

import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { PageHeading } from '@/components/vela/section-heading'
import { EmptyState } from '@/components/vela/empty-state'

export const metadata: Metadata = { title: 'システム' }

export default function Page() {
  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>システム</CrumbCurrent>
      </Crumb>
      <PageHeading>システム</PageHeading>
      <EmptyState spot="tuner" className="mt-3.5">
        システムの画面はこれから実装されます。
      </EmptyState>
    </>
  )
}
