import type { Metadata } from 'next'

import { getTuners } from '@/repository/tuners'
import { TunersView } from '@/page-component/settings/tuners-view'

export const metadata: Metadata = { title: 'チューナー' }

export default async function Page() {
  const result = await getTuners()

  return <TunersView result={result} />
}
