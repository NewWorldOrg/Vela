import type { Metadata } from 'next'

import { getIntegrity } from '@/repository/integrity'
import { IntegrityView } from '@/components/integrity/integrity-page'
import { sweepForIntegrity } from '@/app/(app)/library/integrity/actions'

export const metadata: Metadata = { title: '整合性チェック' }

export default async function Page() {
  const result = await getIntegrity()

  return <IntegrityView result={result} onRun={sweepForIntegrity} />
}
