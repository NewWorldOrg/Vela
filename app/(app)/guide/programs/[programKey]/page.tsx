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
  const detail = await getProgram(programKey)
  return { title: detail ? detail.program.title : 'ページが見つかりません' }
}

export default async function Page({
  params,
}: {
  params: Promise<{ programKey: string }>
}) {
  const { programKey } = await params
  const detail = await getProgram(programKey)
  if (!detail) {
    notFound()
  }

  return (
    <ProgramDetailView program={detail.program} dayLabel={detail.day.label} />
  )
}
