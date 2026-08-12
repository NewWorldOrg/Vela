import type { Metadata } from 'next'

import { listRules } from '@/repository/reservations'
import { RulesView } from '@/page-component/reservations/rules-view'

export const metadata: Metadata = { title: 'ルール' }

export default async function Page() {
  const rules = await listRules()

  return <RulesView rules={rules} />
}
