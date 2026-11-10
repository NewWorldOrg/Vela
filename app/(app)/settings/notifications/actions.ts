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

export async function addDestination(
  draft: WebhookDraft,
): Promise<NotificationWrite> {
  const result = await registerDestination(draft)

  revalidatePath(NOTIFICATIONS)

  return result
}

export async function changeDestination(
  id: string,
  revision: DestinationRevision,
): Promise<NotificationWrite> {
  const result = await reviseDestination(id, revision)

  revalidatePath(NOTIFICATIONS)

  return result
}

export async function turnDestination(
  id: string,
  enabled: boolean,
): Promise<NotificationWrite> {
  const result = await switchDestination(id, enabled)

  revalidatePath(NOTIFICATIONS)

  return result
}

export async function sendTrial(id: string): Promise<TestSending> {
  const result = await tryDestination(id)

  revalidatePath(NOTIFICATIONS)

  return result
}

export async function dropDestination(id: string): Promise<NotificationWrite> {
  const result = await removeDestination(id)

  revalidatePath(NOTIFICATIONS)

  return result
}

export async function addRuleSet(
  draft: RuleSetDraft,
): Promise<NotificationWrite> {
  const result = await defineRuleSet(draft)

  revalidatePath(NOTIFICATIONS)

  return result
}

export async function changeRuleSet(
  id: string,
  draft: RuleSetDraft,
): Promise<NotificationWrite> {
  const result = await reviseRuleSet(id, draft)

  revalidatePath(NOTIFICATIONS)

  return result
}

export async function turnRuleSet(
  id: string,
  enabled: boolean,
): Promise<NotificationWrite> {
  const result = await switchRuleSet(id, enabled)

  revalidatePath(NOTIFICATIONS)

  return result
}

export async function dropRuleSet(id: string): Promise<NotificationWrite> {
  const result = await removeRuleSet(id)

  revalidatePath(NOTIFICATIONS)

  return result
}

export async function settleTheLead(
  lead: LeadMinutes,
): Promise<NotificationWrite> {
  const result = await settleLead(lead)

  revalidatePath(NOTIFICATIONS)

  return result
}
