import type { Metadata } from 'next'

import { getSegmentStatus } from '@/repository/segment-status'
import { SegmentsView } from '@/components/segments/segments-page'

export const metadata: Metadata = { title: 'CM・OP・ED' }

export default async function Page() {
  const status = await getSegmentStatus()

  return <SegmentsView status={status} />
}
