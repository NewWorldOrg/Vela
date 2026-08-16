import type { Metadata } from 'next'
import { cookies } from 'next/headers'

import {
  RESTART_TICKET_COOKIE,
  getTuners,
  parseRestartTicket,
  toRestartWindow,
} from '@/repository/tuners'
import { TunersView } from '@/page-component/settings/tuners-view'
import {
  askDriverToRestart,
  dismissRestartWindow,
  toggleTuner,
} from './actions'

export const metadata: Metadata = { title: 'チューナー' }

export default async function Page() {
  const [result, store] = await Promise.all([getTuners(), cookies()])

  const restartWindow = toRestartWindow(
    parseRestartTicket(store.get(RESTART_TICKET_COOKIE)?.value),
    result.state === 'ok' ? result.result : undefined,
  )

  return (
    <TunersView
      result={result}
      restartWindow={restartWindow}
      onToggle={toggleTuner}
      onRestart={askDriverToRestart}
      onDismiss={dismissRestartWindow}
    />
  )
}
