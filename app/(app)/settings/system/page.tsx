import type { Metadata } from 'next'

import { getSystemStatus } from '@/repository/system'
import { SystemView } from '@/components/system/system-page'

export const metadata: Metadata = { title: 'システム' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const status = await getSystemStatus()

  return <SystemView status={status} />
}
