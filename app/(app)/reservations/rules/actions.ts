'use server'

import { revalidatePath } from 'next/cache'

import type {
  Rule,
  RuleDraft,
  RuleImpact,
  RulePreview,
  RuleRetirement,
  RuleWrite,
} from '@/repository/rules'
import {
  createRule,
  deleteRule,
  impactOfRule,
  previewRule,
  replaceRule,
  switchRule,
} from '@/repository/rules'

const RULES = '/reservations/rules'

const RESERVATIONS = '/reservations'

/**
 * A rule is written and the reservations it owns are settled again behind it,
 * so both lists are read afresh after every write.
 */
function written(): void {
  revalidatePath(RULES)
  revalidatePath(RESERVATIONS)
}

export async function saveRule(
  id: string | undefined,
  draft: RuleDraft,
): Promise<RuleWrite<Rule>> {
  const result = id ? await replaceRule(id, draft) : await createRule(draft)

  written()

  return result
}

export async function dropRule(id: string): Promise<RuleWrite<RuleRetirement>> {
  const result = await deleteRule(id)

  written()

  return result
}

export async function turnRule(
  id: string,
  enabled: boolean,
): Promise<RuleWrite<number>> {
  const result = await switchRule(id, enabled)

  written()

  return result
}

export async function rehearseRule(
  draft: RuleDraft,
  id?: string,
): Promise<RuleWrite<RulePreview>> {
  return previewRule(draft, id)
}

export async function weighRule(
  draft: RuleDraft,
  id?: string,
): Promise<RuleWrite<RuleImpact>> {
  return impactOfRule(draft, id)
}
