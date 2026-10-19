import { signedOut } from '@/lib/signed-out'
import { couldNot } from '@/lib/try-again'
import type {
  RecalledKind,
  SegmentKindRecall,
} from '@/repository/segment-status'
import type {
  SkipThresholdRefusal,
  SegmentVersionRefusal,
} from '@/repository/segments'

export const NOT_APPLICABLE = '対象なし'

export const LEARNING_OFF = '無効'

export const SKIP_THRESHOLD_LOWEST = 0.5

export const SKIP_THRESHOLD_HIGHEST = 0.95

export function versionLabel(number: number): string {
  return `第 ${number} 版`
}

export function shareOf(share: number): string {
  return `${Math.round(share * 100)}%`
}

export function boundaryMatchOf(
  within2s: number | undefined,
  within1s?: number,
): string {
  const said = [
    within2s === undefined ? undefined : `±2 秒 ${shareOf(within2s)}`,
    within1s === undefined ? undefined : `±1 秒 ${shareOf(within1s)}`,
  ].filter((one): one is string => one !== undefined)

  return said.length === 0 ? NOT_APPLICABLE : said.join('・')
}

export const CHECKED_RECORDINGS = 'カタログで答え合わせした録画'

export function recordingsOf(count: number): string {
  return `${count} 本`
}

const RECALL_NAMES: Record<RecalledKind, string> = {
  break: 'CM の再現率',
  opening: 'OP の再現率',
  ending: 'ED の再現率',
}

export function recallOf(recall: number | undefined): string {
  return recall === undefined ? NOT_APPLICABLE : shareOf(recall)
}

export function recallRowsOf(
  kinds: SegmentKindRecall[] | undefined,
): { name: string; value: string }[] {
  const said = kinds ?? []
  const shown: SegmentKindRecall[] = said.some((one) => one.kind === 'break')
    ? said
    : [{ kind: 'break' }, ...said]

  return shown.map((one) => ({
    name: RECALL_NAMES[one.kind],
    value: recallOf(one.recall),
  }))
}

export function returnedAfterSkipOf(share: number | undefined): string {
  return share === undefined ? NOT_APPLICABLE : `${shareOf(share)}(直近 7 日)`
}

export function thresholdOf(threshold: number): string {
  return threshold.toFixed(2)
}

export interface EvidenceCounts {
  recordings: number
  boundaries: number
  enough: boolean
  recordingsNeeded: number
  boundariesNeeded: number
}

export function evidenceShortOf(evidence: EvidenceCounts): string | undefined {
  if (evidence.enough) {
    return undefined
  }

  const recordingsShort = evidence.recordings < evidence.recordingsNeeded
  const boundariesShort = evidence.boundaries < evidence.boundariesNeeded
  const recordings = `答え合わせできる録画 ${evidence.recordings} / ${evidence.recordingsNeeded} 本`
  const boundaries = `CM の境目 ${evidence.boundaries} / ${evidence.boundariesNeeded} か所`

  if (boundariesShort && !recordingsShort) {
    return boundaries
  }

  return boundariesShort ? `${recordings}・${boundaries}` : recordings
}

export function repeatedSoundsOf(catalog: {
  cm: number
  programmeFixture: number
}): string {
  return `CM ${catalog.cm}・番組の決まった部分 ${catalog.programmeFixture}`
}

export const SKIP_THRESHOLD_RANGE = `閾値は ${thresholdOf(SKIP_THRESHOLD_LOWEST)} 〜 ${thresholdOf(SKIP_THRESHOLD_HIGHEST)} です。`

export function skipThresholdProblem(typed: string): string | undefined {
  const amount = Number(typed.trim())

  if (typed.trim() === '' || !Number.isFinite(amount)) {
    return '数値を入力してください。'
  }

  return amount < SKIP_THRESHOLD_LOWEST || amount > SKIP_THRESHOLD_HIGHEST
    ? SKIP_THRESHOLD_RANGE
    : undefined
}

export function skipThresholdToSend(typed: string): number {
  return Math.round(Number(typed.trim()) * 100) / 100
}

const SWITCH = '切り替え'

const CHANGE = '変更'

function refusalOf(refusal: SegmentVersionRefusal, action: string): string {
  switch (refusal) {
    case 'learningOff':
      return `学習が無効のため、${action}できませんでした。`
    case 'unauthenticated':
      return signedOut(action)
    default:
      return couldNot(`${action}できませんでした`)
  }
}

export function switchRefusalOf(refusal: SegmentVersionRefusal): string {
  return refusalOf(refusal, SWITCH)
}

export function backToAutomaticRefusalOf(
  refusal: SegmentVersionRefusal,
): string {
  return refusalOf(refusal, CHANGE)
}

export function skipThresholdRefusalOf(refusal: SkipThresholdRefusal): string {
  if (refusal === 'outOfRange') {
    return SKIP_THRESHOLD_RANGE
  }

  return refusal === 'unauthenticated'
    ? signedOut('保存')
    : couldNot('保存できませんでした')
}
