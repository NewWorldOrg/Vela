import { formatBytes, formatStamp } from '@/lib/format'
import { shapeFor, wordFor } from '@/lib/not-yet-in-this-build'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import { toInt } from '@/repository/programmes'
import { grouped } from '@/repository/recordings'
import { whatItSaid } from '@/repository/said'

type FindingResponder = components['schemas']['IntegrityFindingResponder']
type CheckResponder = components['schemas']['IntegrityCheckResponder']
type RootResponder = components['schemas']['StorageRootResponder']

export type IntegrityFault = components['schemas']['IntegrityFault']

export interface IntegrityFinding {
  key: string
  id: string
  fault: IntegrityFault
  reason: string
  root: string
  path: string
  recordingId?: string
  size: string
  sizeNote?: string
  noticedAt: string
}

export interface IntegrityCheck {
  ranAt: string
  rootsWalked: number
  rootsOutOfReach: number
  filesRead: number
  ledgerRowsRead: number
  ledgerRowsJudged: number
  ledgerRowsStillWriting: number
  ledgerRowsInRootsOutOfReach: number
}

export interface StorageRoot {
  name: string
  free: string
  total: string
  writable: boolean
  recordingsInFlight: number
}

export interface IntegrityResult {
  check?: IntegrityCheck
  findings: IntegrityFinding[]
  total: number
  roots: StorageRoot[]
  storageProblem?: string
}

export type SweepWrite =
  { state: 'ok'; findings: number } | { state: 'refused'; message: string }

export type FindingDiscarded =
  | { state: 'ok' }
  | { state: 'unauthenticated' }
  | { state: 'rejected'; message: string }

const UNREADABLE = '整合性チェックの結果を読めませんでした'

const STORAGE_UNREADABLE = '保存先の空き容量を読めませんでした。'

const MOST_PER_PAGE = 200

const REASON: Record<IntegrityFault, string> = {
  sizeDisagrees: '録画の記録とサイズが食い違う',
  noLedgerRow: '録画の記録に対応する行が無い',
  fileMissing: '録画の記録に行があるが実ファイルが無い',
  fileEmpty: '0 バイト',
  emptyThoughComplete: '0 バイト(録画は完走している)',
}

export const INTEGRITY_REASON = REASON

export async function getIntegrity(): Promise<IntegrityResult> {
  const client = carinaClient()
  const [listing, storage] = await Promise.all([
    client.GET('/api/recordings/integrity', {
      params: { query: { page: 1, perPage: MOST_PER_PAGE } },
    }),
    client.GET('/api/storage'),
  ])

  if (listing.error || !listing.data?.data) {
    throw new Error(whatItSaid(listing.error, listing.data) || UNREADABLE)
  }

  const answered = listing.data.data
  const roots = storage.data?.data?.roots

  return {
    check: answered.check ? toCheck(answered.check) : undefined,
    findings: answered.items.map(toFinding),
    total: toInt(answered.total),
    roots: (roots ?? []).map(toRoot),
    storageProblem: roots ? undefined : STORAGE_UNREADABLE,
  }
}

export async function runIntegrityCheck(): Promise<SweepWrite> {
  const { data, error, response } = await carinaClient().POST(
    '/api/recordings/integrity/run',
  )

  if (response.ok && data?.data) {
    return { state: 'ok', findings: toInt(data.data.findings) }
  }

  return { state: 'refused', message: refusalOf(response, error?.data) }
}

type SweepRefused = components['schemas']['IntegritySweepRefusedResponder']
type SweepDone = components['schemas']['IntegritySweepResponder']

const ALREADY_RUNNING =
  'いま別の整合性チェックが走っています。終わるまで待ってからもう一度お試しください。'

const TOO_SOON = '直前の整合性チェックから間がないため、まだ実行できません。'

function refusalOf(
  response: Response,
  answered: SweepRefused | SweepDone | null | undefined,
): string {
  if (!answered || !('refusal' in answered)) {
    return `整合性チェックを実行できませんでした(${response.status})。`
  }

  if (answered.refusal === 'oneIsAlreadyRunning') {
    return ALREADY_RUNNING
  }

  if (answered.refusal === 'tooSoonAfterTheLastOne') {
    return answered.notBefore
      ? `${TOO_SOON}次に実行できるのは ${formatStamp(answered.notBefore)} です。`
      : TOO_SOON
  }

  return `整合性チェックを実行できませんでした(${response.status})。`
}

type FindingRefusal = components['schemas']['FindingDisposalFailure']

type FindingRefused = components['schemas']['IntegrityFindingRefusedResponder']

const RUN_AGAIN = '整合性チェックをもう一度実行してください。'

const DISCARD_REFUSAL: Record<FindingRefusal, string> = {
  noSuchFinding: `この検出結果はもう残っていません。${RUN_AGAIN}`,
  namesARecording:
    'このファイルは録画の記録に結び付いています。録画のほうを削除してください。',
  nothingOnTheDisk: 'このファイルはもう保存先にありません。',
  alreadyThrownAway: 'このファイルはすでに削除されています。',
  noTimeWasTaken: `検出した時刻を記録する前のチェックの結果のため、削除していません。${RUN_AGAIN}`,
  oneIsAlreadyBeingThrownAway:
    '別のファイルを削除しています。終わってからもう一度お試しください。',
  rootOutOfReach: '保存先に到達できないため、削除していません。',
  fileChanged: `検出の後にファイルが変わったため、削除していません。${RUN_AGAIN}`,
  stillBeingWritten: 'このファイルは書き込み中のため、削除していません。',
  filesLeftBehind: 'ファイルを削除しきれませんでした。もう一度お試しください。',
  driverUnreachable: '保存先の一覧を確認できないため、削除していません。',
  driverRefused: '保存先の一覧の確認を断られたため、削除していません。',
  tookTooLong: '保存先の確認に時間がかかりすぎたため、削除していません。',
}

const CANNOT_DISCARD = 'ファイルを削除できませんでした'

export async function discardIntegrityFinding(
  findingId: string,
): Promise<FindingDiscarded> {
  const { error, response } = await carinaClient().POST(
    '/api/recordings/integrity/findings/{findingId}/delete',
    { params: { path: { findingId } } },
  )

  if (response.status === 401) {
    return { state: 'unauthenticated' }
  }

  if (response.ok) {
    return { state: 'ok' }
  }

  const refused = error?.data as FindingRefused | null | undefined
  const refusal = refused
    ? shapeFor(DISCARD_REFUSAL, refused.refusal, undefined)
    : undefined

  return {
    state: 'rejected',
    message: refusal ?? `${CANNOT_DISCARD}(${response.status})。`,
  }
}

function toCheck(check: CheckResponder): IntegrityCheck {
  return {
    ranAt: formatStamp(check.finishedAt),
    rootsWalked: toInt(check.rootsWalked),
    rootsOutOfReach: toInt(check.rootsOutOfReach),
    filesRead: toInt(check.filesRead),
    ledgerRowsRead: toInt(check.ledgerRowsRead),
    ledgerRowsJudged: toInt(check.ledgerRowsJudged),
    ledgerRowsStillWriting: toInt(check.ledgerRowsStillWriting),
    ledgerRowsInRootsOutOfReach: toInt(check.ledgerRowsInRootsOutOfReach),
  }
}

function toFinding(finding: FindingResponder): IntegrityFinding {
  const observed = counted(finding.observedSize)
  const ledger = counted(finding.ledgerSize)

  return {
    key: `${finding.outputRoot}/${finding.path}`,
    id: finding.id,
    fault: finding.fault,
    reason: wordFor(REASON, finding.fault),
    root: finding.outputRoot,
    path: finding.path,
    recordingId: finding.recordingId ?? undefined,
    size: observed === undefined ? '—' : `${grouped(observed)} B`,
    sizeNote:
      ledger === undefined ? undefined : `録画の記録では ${grouped(ledger)} B`,
    noticedAt: formatStamp(finding.noticedAt),
  }
}

function toRoot(root: RootResponder): StorageRoot {
  return {
    name: root.name,
    free: formatBytes(toInt(root.freeBytes)),
    total: formatBytes(toInt(root.totalBytes)),
    writable: root.writable,
    recordingsInFlight: toInt(root.recordingsInFlight),
  }
}

function counted(value: number | string | null): number | undefined {
  return value == null ? undefined : toInt(value)
}
