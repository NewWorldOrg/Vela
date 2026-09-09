import type { Metadata } from 'next'

import { QUALITY_EVENT } from '@/repository/events'
import { getQuality } from '@/repository/quality'
import { RefreshOnSignal } from '@/components/vela/app-signals'
import { QualityView } from '@/components/quality/quality-page'
import { changeThreshold } from './actions'

export const metadata: Metadata = { title: '品質' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { days } = await searchParams
  const result = await getQuality(typeof days === 'string' ? days : undefined)

  return (
    <>
      <RefreshOnSignal events={[QUALITY_EVENT]} />
      <QualityView result={result} onReviseThreshold={changeThreshold} />
    </>
  )
}
