import type { Metadata } from 'next'

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
  const proposal = await getScanProposal(scanId)

  return <ScanProposalView proposal={proposal} onApply={commitScan} />
}
