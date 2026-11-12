import type { Metadata } from 'next'

import { getNotificationsScreen } from '@/repository/notifications'
import { NotificationsHere } from '@/components/notifications/notifications-here'
import { readServerKey } from '../../_shell/actions'
import {
  addBrowser,
  addDestination,
  addRuleSet,
  changeDestination,
  changeRuleSet,
  dropDestination,
  dropRuleSet,
  sendTrial,
  settleTheLead,
  turnDestination,
  turnRuleSet,
} from './actions'

export const metadata: Metadata = { title: '通知' }

export default async function Page() {
  const screen = await getNotificationsScreen()

  return (
    <NotificationsHere
      screen={screen}
      push={{ readKey: readServerKey, add: addBrowser }}
      actions={{
        onAddWebhook: addDestination,
        onReviseDestination: changeDestination,
        onToggleDestination: turnDestination,
        onTestDestination: sendTrial,
        onRemoveDestination: dropDestination,
        onAddRuleSet: addRuleSet,
        onReviseRuleSet: changeRuleSet,
        onToggleRuleSet: turnRuleSet,
        onRemoveRuleSet: dropRuleSet,
        onSettleLead: settleTheLead,
      }}
    />
  )
}
