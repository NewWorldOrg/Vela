import type { Metadata } from 'next'

import { searchPrograms } from '@/repository/search'
import { SearchView } from '@/components/search/search-page'

export const metadata: Metadata = { title: '番組検索' }

function str(v: string | string[] | undefined) {
  return typeof v === 'string' ? v : undefined
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const result = await searchPrograms({
    q: str(params.q),
    from: str(params.from),
    to: str(params.to),
    sort: str(params.sort),
    perPage: str(params.per_page),
    page: str(params.page),
  })

  return <SearchView result={result} />
}
