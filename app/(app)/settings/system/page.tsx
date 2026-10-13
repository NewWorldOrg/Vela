import type { Metadata } from 'next'

import { velaVersion } from '@/lib/version'
import { getSegmentSettings } from '@/repository/segments'
import { getSystemStatus } from '@/repository/system'
import { SystemView } from '@/components/system/system-page'
import { settleTheLearning } from './actions'

export const metadata: Metadata = { title: 'システム' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const [status, segmentSettings] = await Promise.all([
    getSystemStatus(),
    getSegmentSettings(),
  ])

  return (
    <SystemView
      status={status}
      velaVersion={velaVersion()}
      segmentSettings={segmentSettings}
      onSettleLearning={settleTheLearning}
    />
  )
}
