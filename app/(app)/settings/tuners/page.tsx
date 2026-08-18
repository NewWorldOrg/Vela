import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import {
  RESTART_TICKET_COOKIE,
  getDetectedTuners,
  getTuners,
  parseRestartTicket,
  toRestartWindow,
} from '@/repository/tuners'
import { TunersView } from '@/components/tuners/tuners-page'
import {
  askDriverToRestart,
  dismissRestartWindow,
  saveDetection,
  toggleTuner,
} from './actions'

export const metadata: Metadata = { title: 'チューナー' }

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ detect?: string }>
}) {
  const { detect } = await searchParams
  const asked = detect !== undefined

  const [result, detection, store] = await Promise.all([
    getTuners(),
    asked ? getDetectedTuners() : undefined,
    cookies(),
  ])

  const restartWindow = toRestartWindow(
    parseRestartTicket(store.get(RESTART_TICKET_COOKIE)?.value),
    result.state === 'ok' ? result.result : undefined,
  )

  return (
    <TunersView
      result={result}
      detection={detection}
      restartWindow={restartWindow}
      onToggle={toggleTuner}
      onRestart={askDriverToRestart}
      onDismiss={dismissRestartWindow}
      onSaveDetection={saveDetection}
    />
  )
}
