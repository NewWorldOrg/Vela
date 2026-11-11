import type { Metadata } from 'next'

import { getIntegrity } from '@/repository/integrity'
import { IntegrityView } from '@/components/integrity/integrity-view'
import {
  redrawMissingThumbnail,
  sweepForIntegrity,
  throwStrayAway,
} from '@/app/(app)/settings/integrity/actions'

export const metadata: Metadata = { title: '整合性チェック' }

export default async function Page() {
  const result = await getIntegrity()

  return (
    <IntegrityView
      result={result}
      onRun={sweepForIntegrity}
      onDelete={throwStrayAway}
      onRemake={redrawMissingThumbnail}
    />
  )
}
