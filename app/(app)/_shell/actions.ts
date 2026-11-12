'use server'

import { unstable_rethrow } from 'next/navigation'

import type {
  BrowserRow,
  BrowserWrite,
  PushKeyAnswer,
  PushSubscriptionDraft,
} from '@/lib/web-push'
import {
  listBrowserRows,
  readPushKey,
  replaceBrowserSubscription,
} from '@/repository/notifications'

export async function readServerKey(): Promise<PushKeyAnswer> {
  return readPushKey()
}

/** The browser rows, or nothing while they cannot be read. */
export async function readBrowserRows(): Promise<BrowserRow[] | undefined> {
  try {
    return await listBrowserRows()
  } catch (error) {
    unstable_rethrow(error)

    return undefined
  }
}

export async function putSubscription(
  destinationId: string,
  draft: PushSubscriptionDraft,
): Promise<BrowserWrite> {
  return replaceBrowserSubscription(destinationId, draft)
}
