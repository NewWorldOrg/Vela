import type { Metadata } from 'next'

import { getMigration } from '@/repository/migration'
import { MigrationView } from '@/components/migration/migration-view'

export const metadata: Metadata = { title: '移行記録' }

export default async function Page() {
  const result = await getMigration()

  return <MigrationView result={result} />
}
