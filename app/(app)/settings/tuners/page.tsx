import type { Metadata } from 'next'

import { getDetectedTuners, getTuners } from '@/repository/tuners'
import { TunersView } from '@/page-component/settings/tuners-view'
import { saveDetection, toggleTuner } from './actions'

export const metadata: Metadata = { title: 'チューナー' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ detect?: string }>
}) {
  const { detect } = await searchParams
  const asked = detect !== undefined

  const [result, detection] = await Promise.all([
    getTuners(),
    asked ? getDetectedTuners() : undefined,
  ])

  return (
    <TunersView
      result={result}
      detection={detection}
      onToggle={toggleTuner}
      onSaveDetection={saveDetection}
    />
  )
}
