'use client'

import { signedOut } from '@/lib/signed-out'
import { type NotificationWrite, type WatchWrite } from '@/lib/notifications'

export const NOTIFY_START = '放送開始を通知'

export const STOP_NOTIFYING = '通知を取り消す'

const SIGNED_OUT = signedOut('通知の設定')

export function refusalOf(
  result: Exclude<NotificationWrite | WatchWrite, { state: 'ok' }>,
): string {
  return result.state === 'unauthenticated' ? SIGNED_OUT : result.message
}
