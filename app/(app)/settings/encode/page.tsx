import type { Metadata } from 'next'

import { getEncodeScreen } from '@/repository/encode'
import { EncodeView } from '@/components/encode/encode-page'
import { addDestination, addProfile, callOffJob } from './actions'

export const metadata: Metadata = { title: 'エンコード' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { status, page } = await searchParams
  const screen = await getEncodeScreen({ status, page })

  return (
    <EncodeView
      screen={screen}
      actions={{
        onDefineProfile: addProfile,
        onDefineDestination: addDestination,
        onCallOff: callOffJob,
      }}
    />
  )
}
