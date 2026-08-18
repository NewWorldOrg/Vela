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
    exclude: str(params.exclude),
    fields: str(params.fields),
    genre: str(params.genre),
    kind: str(params.kind),
    ch: str(params.ch),
  })

  return <SearchView result={result} />
}
