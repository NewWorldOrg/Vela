import { formatStamp } from '@/lib/format'
import { wordFor } from '@/lib/not-yet-in-this-build'
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
    free: `${grouped(toInt(root.freeBytes))} B`,
    total: `${grouped(toInt(root.totalBytes))} B`,
    writable: root.writable,
    recordingsInFlight: toInt(root.recordingsInFlight),
  }
}

function counted(value: number | string | null): number | undefined {
  return value == null ? undefined : toInt(value)
}
