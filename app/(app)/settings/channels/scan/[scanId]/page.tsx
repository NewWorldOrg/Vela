import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getScanProposal } from '@/repository/services'
import { ScanProposalView } from '@/page-component/settings/scan-proposal-view'
import { commitScan } from '../../actions'

export const metadata: Metadata = { title: 'スキャン結果' }

export default async function Page({
  params,
}: {
  params: Promise<{ scanId: string }>
}) {
  const { scanId } = await params
  const result = await getScanProposal(scanId)

  if (result.state === 'missing') {
    notFound()
  }

  return <ScanProposalView result={result} onApply={commitScan} />
}
