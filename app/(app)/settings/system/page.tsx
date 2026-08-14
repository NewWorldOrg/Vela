import type { Metadata } from 'next'

import { getSystemStatus } from '@/repository/system'
import { SystemView } from '@/page-component/settings/system-view'

export const metadata: Metadata = { title: 'システム' }
export const dynamic = 'force-dynamic'

export default async function Page() {
  const status = await getSystemStatus()

  return <SystemView status={status} />
}
