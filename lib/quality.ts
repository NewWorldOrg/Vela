import type {
  QualityThreshold,
  QualityThresholdKey,
  QualityThresholdWrite,
} from '@/repository/quality'

export type QualityLevel =
  | 'good'
  | 'warn'
  | 'bad'
  | 'unmeasured'
  | 'nodata'
  | 'unsupported'
  | 'unreachable'

export const QUALITY_LEVEL_LABEL: Record<QualityLevel, string> = {
  good: '良好',
  warn: '警告水準',
  bad: '視聴不可の恐れ',
  unmeasured: '未計測',
  nodata: '対象なし',
  unsupported: '非対応',
  unreachable: '取得できず',
}

export const UNWATCHABLE_PILL = '視聴不可'

export const QUALITY_PILL_LABEL: Record<QualityLevel, string> = {
  ...QUALITY_LEVEL_LABEL,
  bad: UNWATCHABLE_PILL,
}

export function saidWithUnit(value: number | string, unit: string): string {
  return unit === '%' || unit === '' ? `${value}${unit}` : `${value} ${unit}`
}

export function thresholdProblem(
  typed: string,
  lowest: number,
  highest: number,
  unit: string,
): string | undefined {
  const amount = Number(typed.trim())

  if (typed.trim() === '' || !Number.isFinite(amount)) {
    return '数値を入力してください。'
  }

  if (amount < lowest || amount > highest) {
    return `値は ${lowest} 〜 ${saidWithUnit(highest, unit)} です。`
  }

  return undefined
}

export type ThresholdDraft =
  { kind: 'typed'; text: string } | { kind: 'released' }

export type ThresholdDrafts = Partial<
  Record<QualityThresholdKey, ThresholdDraft>
>

export type ThresholdProblems = Partial<Record<QualityThresholdKey, string>>

interface ThresholdPair {
  lower: QualityThreshold
  upper: QualityThreshold
}

export function shownInForm(
  threshold: QualityThreshold,
  draft: ThresholdDraft | undefined,
): string {
  if (draft?.kind === 'typed') {
    return draft.text
  }

  if (draft?.kind === 'released') {
    return threshold.releasedAmount ?? threshold.amount
  }

  return threshold.amount
}

export function isChanged(
  threshold: QualityThreshold,
  draft: ThresholdDraft | undefined,
): boolean {
  if (draft === undefined) {
    return false
  }

  if (draft.kind === 'released') {
    return true
  }

  const typed = draft.text.trim()

  return (
    typed !== threshold.amount &&
    (typed === '' || Number(typed) !== Number(threshold.amount))
  )
}

export function thresholdFormProblems(
  thresholds: QualityThreshold[],
  drafts: ThresholdDrafts,
): ThresholdProblems {
  const typos = Object.fromEntries(
    thresholds.flatMap((threshold) => {
      const problem = typoOf(threshold, drafts[threshold.key])

      return problem ? [[threshold.key, problem]] : []
    }),
  ) as ThresholdProblems

  return pairsOf(thresholds).reduce(
    (problems, pair) => ({ ...problems, ...outOfOrder(pair, drafts, typos) }),
    typos,
  )
}

export function thresholdWrites(
  thresholds: QualityThreshold[],
  drafts: ThresholdDrafts,
): QualityThresholdWrite[] {
  const writes = thresholds.flatMap((threshold) =>
    writeOf(threshold, drafts[threshold.key]),
  )

  return pairsOf(thresholds).reduce(
    (ordered, pair) => raisedFirst(ordered, pair, drafts),
    writes,
  )
}

function typoOf(
  threshold: QualityThreshold,
  draft: ThresholdDraft | undefined,
): string | undefined {
  if (draft?.kind !== 'typed' || !isChanged(threshold, draft)) {
    return undefined
  }

  return thresholdProblem(
    draft.text,
    threshold.lowest,
    threshold.highest,
    threshold.unit,
  )
}

function pairsOf(thresholds: QualityThreshold[]): ThresholdPair[] {
  return thresholds.flatMap((lower) => {
    const upper = thresholds.find((one) => one.key === lower.atMost)

    return upper ? [{ lower, upper }] : []
  })
}

function outOfOrder(
  { lower, upper }: ThresholdPair,
  drafts: ThresholdDrafts,
  typos: ThresholdProblems,
): ThresholdProblems {
  const lowerMoved = isChanged(lower, drafts[lower.key])
  const upperMoved = isChanged(upper, drafts[upper.key])

  if ((!lowerMoved && !upperMoved) || typos[lower.key] || typos[upper.key]) {
    return {}
  }

  const below = shownInForm(lower, drafts[lower.key]).trim()
  const above = shownInForm(upper, drafts[upper.key]).trim()

  if (Number(below) <= Number(above)) {
    return {}
  }

  return {
    ...(lowerMoved
      ? {
          [lower.key]: `値は ${upper.label}(${saidWithUnit(above, upper.unit)})以下です。`,
        }
      : {}),
    ...(upperMoved
      ? {
          [upper.key]: `値は ${lower.label}(${saidWithUnit(below, lower.unit)})以上です。`,
        }
      : {}),
  }
}

function writeOf(
  threshold: QualityThreshold,
  draft: ThresholdDraft | undefined,
): QualityThresholdWrite[] {
  if (draft === undefined || !isChanged(threshold, draft)) {
    return []
  }

  if (draft.kind === 'released') {
    return [{ kind: 'release', key: threshold.key }]
  }

  return [
    { kind: 'revise', key: threshold.key, amount: Number(draft.text.trim()) },
  ]
}

function raisedFirst(
  writes: QualityThresholdWrite[],
  { lower, upper }: ThresholdPair,
  drafts: ThresholdDrafts,
): QualityThresholdWrite[] {
  const raised = writes.find((one) => one.key === upper.key)
  const rest = writes.filter((one) => one !== raised)
  const lowerAt = rest.findIndex((one) => one.key === lower.key)
  const lowerFits =
    Number(shownInForm(lower, drafts[lower.key])) <= Number(upper.amount)

  if (raised === undefined || lowerAt < 0 || lowerFits) {
    return writes
  }

  return [...rest.slice(0, lowerAt), raised, ...rest.slice(lowerAt)]
}
