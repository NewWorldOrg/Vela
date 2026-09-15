import type { Metadata } from 'next'

import { QUALITY_EVENT } from '@/repository/events'
import { getQuality } from '@/repository/quality'
import { RefreshOnSignal } from '@/components/vela/app-signals'
import { QualityView } from '@/components/quality/quality-page'
import { acknowledge, changeThreshold } from './actions'

export const metadata: Metadata = { title: '品質' }

const ACKNOWLEDGED_SHOWN = 'true'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { days, acknowledged, subject } = await searchParams
  const result = await getQuality(
    typeof days === 'string' ? days : undefined,
    acknowledged === ACKNOWLEDGED_SHOWN,
    typeof subject === 'string' ? subject : undefined,
  )

  return (
    <>
      <RefreshOnSignal events={[QUALITY_EVENT]} />
      <QualityView
        result={result}
        onReviseThreshold={changeThreshold}
        onAcknowledge={acknowledge}
      />
    </>
  )
}
