import { formatStamp } from '@/lib/format'
import { carinaClient } from '@/repository/client/carina'
import type { components } from '@/repository/client/schema'
import { toInt } from '@/repository/programmes'
import { grouped } from '@/repository/recordings'

type FindingResponder = components['schemas']['IntegrityFindingResponder']
type CheckResponder = components['schemas']['IntegrityCheckResponder']
type RootResponder = components['schemas']['StorageRootResponder']

export type IntegrityFault = components['schemas']['IntegrityFault']

/**
 * The API hands a finding a fresh identity on every walk, so the one it names
 * cannot stand for the same file across two of them. Nothing here carries it
 * out: the row is keyed by where the file is, which is what a second walk
 * finds again, and no part of the screen remembers a finding between walks.
 */
export interface IntegrityFinding {
  key: string
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
  /** Unset until a check has walked at least once. */
  check?: IntegrityCheck
  findings: IntegrityFinding[]
  total: number
  roots: StorageRoot[]
  /** Set when the roots could not be read; the findings still stand. */
  storageProblem?: string
}

export type SweepWrite =
  { state: 'ok'; findings: number } | { state: 'refused'; message: string }

const UNREADABLE = '整合性チェックの結果を読めませんでした'

const STORAGE_UNREADABLE =
  '保存先の空き容量を読めませんでした。見つかったものの一覧は下のとおりです。'

const MOST_PER_PAGE = 200

/**
 * The reason a finding was raised, in the words the recording screens already
 * use: the row a recording keeps is "録画の記録", never a ledger.
 */
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
    throw new Error(listing.data?.message || UNREADABLE)
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

/**
 * A walk asked for by hand. Only one runs at a time and a fresh one waits for
 * the last to age, so a refusal is an answer rather than a failure.
 */
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

const TOO_SOON =
  '直前の整合性チェックから間がないため、まだ実行できません。録画をすべて読み直す処理のため、少し置いてからお試しください。'

/**
 * A refusal names itself, so it is read rather than guessed from the status.
 * Only a body that says nothing falls back to the number the API answered
 * with.
 */
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

/**
 * A finding names at most two sizes and, depending on what it is, sometimes
 * neither: an orphan has no row to compare against and a missing file has
 * nothing left to weigh. What is unsaid is left unsaid rather than shown as a
 * zero, which is itself one of the faults.
 */
function toFinding(finding: FindingResponder): IntegrityFinding {
  const observed = counted(finding.observedSize)
  const ledger = counted(finding.ledgerSize)

  return {
    key: `${finding.outputRoot}/${finding.path}`,
    fault: finding.fault,
    reason: REASON[finding.fault],
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
    free: `${grouped(toInt(root.freeBytes))} B`,
    total: `${grouped(toInt(root.totalBytes))} B`,
    writable: root.writable,
    recordingsInFlight: toInt(root.recordingsInFlight),
  }
}

function counted(value: number | string | null): number | undefined {
  return value == null ? undefined : toInt(value)
}
