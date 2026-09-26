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
  return unit === '%' ? `${value}${unit}` : `${value} ${unit}`
}

export function thresholdProblem(
  typed: string,
  lowest: number,
  highest: number,
  unit: string,
): string | undefined {
  const amount = Number(typed.trim())

  if (typed.trim() === '' || !Number.isFinite(amount)) {
    return '数値を入力してください'
  }

  if (amount < lowest || amount > highest) {
    return `${lowest} 〜 ${saidWithUnit(highest, unit)} の範囲で入力してください`
  }

  return undefined
}
