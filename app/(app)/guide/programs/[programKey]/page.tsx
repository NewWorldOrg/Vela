import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getProgram } from '@/repository/programs'
import { ProgramDetailView } from '@/page-component/guide/program-detail-view'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ programKey: string }>
}): Promise<Metadata> {
  const { programKey } = await params
  const program = await getProgram(programKey)
  return { title: program ? program.title : 'ページが見つかりません' }
}

export default async function Page({
  params,
}: {
  params: Promise<{ programKey: string }>
}) {
  const { programKey } = await params
  const program = await getProgram(programKey)
  if (!program) notFound()

  return <ProgramDetailView program={program} dayLabel="8/8(金)" />
}
