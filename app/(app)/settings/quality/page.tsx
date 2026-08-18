import type { Metadata } from 'next'

import { getQuality } from '@/repository/quality'
import { QualityView } from '@/components/quality/quality-page'

export const metadata: Metadata = { title: '品質' }

export default async function Page() {
  const result = await getQuality()

  return <QualityView result={result} />
}
