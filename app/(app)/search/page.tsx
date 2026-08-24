import type { Metadata } from 'next'

import { rawSearchConditionOf } from '@/lib/search-condition'
import { searchPrograms } from '@/repository/search'
import { SearchView } from '@/components/search/search-page'

export const metadata: Metadata = { title: '番組検索' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const result = await searchPrograms(rawSearchConditionOf(params))

  return <SearchView result={result} />
}
