'use server'

import { revalidatePath } from 'next/cache'

import type {
  DestinationRevision,
  LeadMinutes,
  NotificationWrite,
  RuleSetDraft,
  TestSending,
  WebhookDraft,
} from '@/lib/notifications'
import { wasAnswered } from '@/lib/notifications'
import {
  defineRuleSet,
  registerDestination,
  removeDestination,
  removeRuleSet,
  reviseDestination,
  reviseRuleSet,
  settleLead,
  switchDestination,
  switchRuleSet,
  tryDestination,
} from '@/repository/notifications'

const NOTIFICATIONS = '/settings/notifications'

/** The page is read again once Carina has answered; a write that never reached it leaves the page as it is. */
function readAgain<T extends NotificationWrite | TestSending>(result: T): T {
  if (wasAnswered(result)) {
    revalidatePath(NOTIFICATIONS)
  }

  return result
}

export async function addDestination(
  draft: WebhookDraft,
): Promise<NotificationWrite> {
  return readAgain(await registerDestination(draft))
}

export async function changeDestination(
  id: string,
  revision: DestinationRevision,
): Promise<NotificationWrite> {
  return readAgain(await reviseDestination(id, revision))
}

export async function turnDestination(
  id: string,
  enabled: boolean,
): Promise<NotificationWrite> {
  return readAgain(await switchDestination(id, enabled))
}

export async function sendTrial(id: string): Promise<TestSending> {
  return readAgain(await tryDestination(id))
}

export async function dropDestination(id: string): Promise<NotificationWrite> {
  return readAgain(await removeDestination(id))
}

export async function addRuleSet(
  draft: RuleSetDraft,
): Promise<NotificationWrite> {
  return readAgain(await defineRuleSet(draft))
}

export async function changeRuleSet(
  id: string,
  draft: RuleSetDraft,
): Promise<NotificationWrite> {
  return readAgain(await reviseRuleSet(id, draft))
}

export async function turnRuleSet(
  id: string,
  enabled: boolean,
): Promise<NotificationWrite> {
  return readAgain(await switchRuleSet(id, enabled))
}

export async function dropRuleSet(id: string): Promise<NotificationWrite> {
  return readAgain(await removeRuleSet(id))
}

export async function settleTheLead(
  lead: LeadMinutes,
): Promise<NotificationWrite> {
  return readAgain(await settleLead(lead))
}
