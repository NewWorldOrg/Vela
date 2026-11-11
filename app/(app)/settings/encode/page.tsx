import type { Metadata } from 'next'

import { getEncodeScreen } from '@/repository/encode'
import { ENCODE_JOBS_EVENT } from '@/repository/events'
import { RefreshOnSignal } from '@/components/vela/refresh-on-signal'
import { EncodeView } from '@/components/encode/encode-view'
import {
  addDestination,
  addProfile,
  callOffJob,
  changeDestination,
  changeProfile,
  dropDestination,
  dropProfile,
  rerunJobs,
  settleTheAutoRun,
} from './actions'

export const metadata: Metadata = { title: 'エンコード' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { status, page } = await searchParams
  const screen = await getEncodeScreen({ status, page })

  return (
    <>
      <RefreshOnSignal events={[ENCODE_JOBS_EVENT]} />
      <EncodeView
        screen={screen}
        actions={{
          onDefineProfile: addProfile,
          onReviseProfile: changeProfile,
          onRemoveProfile: dropProfile,
          onDefineDestination: addDestination,
          onReviseDestination: changeDestination,
          onRemoveDestination: dropDestination,
          onCallOff: callOffJob,
          onRerun: rerunJobs,
          onSettleAutoRun: settleTheAutoRun,
        }}
      />
    </>
  )
}
