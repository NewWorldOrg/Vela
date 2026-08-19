import type { Metadata } from 'next'

import { getGuide } from '@/repository/programs'
import { coverageWarningOf, getCollectionStatus } from '@/repository/collection'
import { GuideLive } from '@/components/guide/guide-live'
import { GuideView } from '@/components/guide/guide-page'
import { boostCollection, discardAndRebuildEpg } from './actions'

export const metadata: Metadata = { title: '番組表' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const [guide, collection] = await Promise.all([
    getGuide(
      typeof params.kind === 'string' ? params.kind : undefined,
      typeof params.date === 'string' ? params.date : undefined,
    ),
    getCollectionStatus(),
  ])

  return (
    <>
      <GuideLive />
      <GuideView
        guide={{
          ...guide,
          coverageWarning: coverageWarningOf(collection, guide.kind),
        }}
        collection={collection}
        onCollectNow={boostCollection}
        onRebuild={discardAndRebuildEpg}
      />
    </>
  )
}
