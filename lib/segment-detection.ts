import { NOT_YET_IN_THIS_BUILD_SAYING } from '@/lib/not-yet-in-this-build'
import { signedOut } from '@/lib/signed-out'
import { couldNot } from '@/lib/try-again'
import type {
  RecalledKind,
  SegmentKindRecall,
  SegmentRound,
  SegmentRoundFigures,
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

export const ROUNDS_EXPLAINED =
  '学習が有効のあいだ、毎日 3 時以降の空き時間に 1 回学習して候補の版を作ります。候補がカタログでの答え合わせで使用中の版より境目を多く当て、答え合わせの量が足りていれば自動で切り替わります。手動で選択した版を使っているあいだは切り替えません。'

export const ROUNDS_LEARNING_OFF =
  '学習が無効のため、候補の版は作られず切り替わりません。'

export const NO_ROUND_YET = 'まだ学習の回はありません。'

const NOT_SWITCHED = '切り替えていません。'

export function nextRoundOf(nextRound: string): string {
  return `次の回: ${nextRound}以降の空き時間。`
}

function candidateOf(round: SegmentRound): string {
  return round.candidate === undefined
    ? '候補の版'
    : `候補の${versionLabel(round.candidate)}`
}

function boundaryOf(figures: SegmentRoundFigures | undefined) {
  return figures?.boundaryRecallWithin2s
}

function figuresSaid(round: SegmentRound): string {
  const found = boundaryOf(round.metrics)
  const inUse = boundaryOf(round.inUse)

  if (found === undefined) {
    return ''
  }

  return inUse === undefined
    ? `境目の一致は ${shareOf(found)}。`
    : `境目の一致は ${shareOf(found)}(使用中の版は ${shareOf(inUse)})。`
}

function tooLittleSaid(round: SegmentRound): string {
  const { evidence } = round

  if (!evidence) {
    return `答え合わせの量が足りないため、${NOT_SWITCHED}`
  }

  if (evidence.enough) {
    return `使用中の版の答え合わせがまだ無いため、${NOT_SWITCHED}`
  }

  const short = [
    evidence.recordings < evidence.recordingsNeeded
      ? `${evidence.recordingsNeeded} 本`
      : undefined,
    evidence.boundaries < evidence.boundariesNeeded
      ? `${evidence.boundariesNeeded} か所`
      : undefined,
  ].filter((one): one is string => one !== undefined)

  return `答え合わせが録画 ${evidence.recordings} 本・境目 ${evidence.boundaries} か所で ${short.join('・')}に足りないため、${NOT_SWITCHED}`
}

function noBetterSaid(round: SegmentRound): string {
  const found = boundaryOf(round.metrics)
  const inUse = boundaryOf(round.inUse)

  if (found === undefined || inUse === undefined) {
    return `境目の一致が使用中の版を上回らなかったため${NOT_SWITCHED}`
  }

  return `境目の一致は ${shareOf(found)}で、使用中の版の ${shareOf(inUse)}を上回らなかったため${NOT_SWITCHED}`
}

function keptSaid(round: SegmentRound): string {
  const made = `${candidateOf(round)}を作りました。`

  switch (round.verdict) {
    case 'tooLittleEvidence':
      return `${made}${figuresSaid(round)}${tooLittleSaid(round)}`
    case 'noBetterAtBoundaries':
      return `${made}${noBetterSaid(round)}`
    case 'chosenByHand':
      return `${made}手動で選択した版を使っているため、${NOT_SWITCHED}`
    default:
      return `${made}${NOT_SWITCHED}`
  }
}

function adoptedSaid(round: SegmentRound): string {
  const made = `${candidateOf(round)}を作り、`
  const found = boundaryOf(round.metrics)
  const inUse = boundaryOf(round.inUse)
  const foundCm = round.metrics?.breakRecall
  const inUseCm = round.inUse?.breakRecall

  if (found === undefined || inUse === undefined) {
    return `${made}使用中の版より境目を多く当てたため切り替えました。`
  }

  if (found === inUse && foundCm !== undefined && inUseCm !== undefined) {
    return `${made}境目の一致は同じ ${shareOf(found)}で、CM の再現率が ${shareOf(inUseCm)}から ${shareOf(foundCm)}に上がったため切り替えました。`
  }

  return shareOf(found) === shareOf(inUse)
    ? `${made}境目の一致が使用中の版の ${shareOf(inUse)}をわずかに上回ったため切り替えました。`
    : `${made}境目の一致が ${shareOf(inUse)}から ${shareOf(found)}に上がったため切り替えました。`
}

function whatBecameOf(round: SegmentRound): string {
  switch (round.outcome) {
    case 'nothingNew':
      return '新しいデータが無く、候補を作りませんでした。'
    case 'nothingToLearnFrom':
      return '学習に使えるデータが無く、候補を作りませんでした。'
    case 'failed':
      return '途中で失敗しました。次の日の回でやり直します。'
    case 'kept':
      return keptSaid(round)
    case 'adopted':
      return adoptedSaid(round)
    case 'heldAfterRollback':
      return `${candidateOf(round)}を作りましたが、戻した直後の 7 日間は切り替えません。`
    case 'inUseChangedMeanwhile':
      return `${candidateOf(round)}を作りましたが、学習中に使用中の版が替わったため${NOT_SWITCHED}`
    default:
      return NOT_YET_IN_THIS_BUILD_SAYING
  }
}

export function lastRoundOf(round: SegmentRound | undefined): string {
  return round
    ? `直近の回(${round.takenAt}): ${whatBecameOf(round)}`
    : NO_ROUND_YET
}
