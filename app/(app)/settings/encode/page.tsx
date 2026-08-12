import type { Metadata } from 'next'

import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { PageHeading } from '@/components/vela/section-heading'
import { EmptyState } from '@/components/vela/empty-state'

export const metadata: Metadata = { title: 'エンコード' }

export default function Page() {
  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>エンコード</CrumbCurrent>
      </Crumb>
      <PageHeading description="録画を一度だけ変換して、再生のたびに払っている CPU を前払いにします。シークが即座になり、視聴が CPU を食わなくなります">
        エンコード
      </PageHeading>
      <EmptyState spot="tape" className="mt-3.5">
        エンコードの画面はこれから実装されます。
      </EmptyState>
    </>
  )
}
