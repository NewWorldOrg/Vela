import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getRecording } from '@/repository/recordings'
import { RecordingDetailView } from '@/components/recordings/recording-detail-page'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const detail = await getRecording(id)
  return { title: detail ? detail.title : 'ページが見つかりません' }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await getRecording(id)
  if (!detail) {
    notFound()
  }

  return <RecordingDetailView detail={detail} />
}
