import type { Metadata } from 'next'

import { getQuality } from '@/repository/quality'
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

  return <QualityView result={result} onReviseThreshold={changeThreshold} />
}
