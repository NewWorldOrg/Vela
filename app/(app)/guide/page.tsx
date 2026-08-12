import type { Metadata } from 'next'

import { getGuide } from '@/repository/programs'
import { GuideView } from '@/page-component/guide/guide-view'

export const metadata: Metadata = { title: '番組表' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const guide = await getGuide(
    typeof params.kind === 'string' ? params.kind : undefined,
    typeof params.date === 'string' ? params.date : undefined,
  )

  return <GuideView guide={guide} />
}
