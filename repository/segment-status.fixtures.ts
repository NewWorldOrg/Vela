import { LOGO_FULL_COLOUR } from '@/repository/logos.fixtures'
import type {
  LearningData,
  SegmentEvidence,
  SegmentMetrics,
  SegmentRound,
  SegmentStatus,
  SegmentVersion,
} from '@/repository/segment-status'
import type { Reading } from '@/repository/system'

const VERSIONS: SegmentVersion[] = [
  {
    number: 4,
    state: 'candidate',
    trainedAt: '11/8(日) 03:00',
    metrics: { boundaryRecallWithin2s: 0.92 },
  },
  {
    number: 3,
    state: 'active',
    trainedAt: '11/1(日) 03:00',
    metrics: { boundaryRecallWithin2s: 0.93 },
  },
  {
    number: 2,
    state: 'retired',
    trainedAt: '10/25(日) 03:00',
    rolledBackAt: '10/28(水) 21:40',
    metrics: { boundaryRecallWithin2s: 0.95 },
  },
  { number: 1, state: 'retired', trainedAt: '10/18(日) 12:00' },
]

const FIRST_VERSION: SegmentVersion[] = [
  { number: 1, state: 'active', trainedAt: '10/18(日) 12:00' },
]

const METRICS: SegmentMetrics = {
  boundaryRecallWithin2s: 0.93,
  boundaryRecallWithin1s: 0.85,
  kinds: [{ kind: 'break', recall: 0.95 }],
  returnedAfterSkipping: 0.03,
}

const ENOUGH: SegmentEvidence = {
  recordings: 12,
  boundaries: 148,
  enough: true,
  recordingsNeeded: 10,
  boundariesNeeded: 100,
}

const IN_USE = { boundaryRecallWithin2s: 0.93, breakRecall: 0.95 }

const NO_BETTER: SegmentRound = {
  takenAt: '11月8日 3:00',
  outcome: 'kept',
  candidate: 4,
  verdict: 'noBetterAtBoundaries',
  inUse: IN_USE,
  evidence: ENOUGH,
  metrics: { boundaryRecallWithin2s: 0.92, breakRecall: 0.96 },
}

const STATUS: SegmentStatus = {
  learning: true,
  learningData: {
    recordings: 312,
    seconds: 674_100,
    bytes: 440_000_000,
    waiting: 0,
  },
  catalog: { cm: 820, programmeFixture: 40 },
  version: { number: 3, byHand: false, adoptedAt: '11/1(日) 03:05' },
  evidence: ENOUGH,
  metrics: METRICS,
  stations: [
    {
      key: '1-101',
      name: '湾岸放送1',
      no: '1',
      logo: LOGO_FULL_COLOUR,
      recordings: 5,
      metrics: { boundaryRecallWithin2s: 0.96 },
    },
    {
      key: '1-104',
      name: '第一テレビ1',
      no: '4',
      recordings: 4,
      metrics: { boundaryRecallWithin2s: 0.91 },
    },
    {
      key: '1-106',
      name: '港町テレビ',
      no: '6',
      recordings: 3,
      metrics: {},
    },
  ],
  versions: VERSIONS,
  skipThreshold: { current: 0.7 },
  lastRound: NO_BETTER,
  nextRound: '11月9日 3時',
}

function read(value: SegmentStatus): Reading<SegmentStatus> {
  return { state: 'ok', value }
}

function withLearningData(data: LearningData): Reading<SegmentStatus> {
  return read({ ...STATUS, learningData: data })
}

export const DETECTION_STATUS = read(STATUS)

export const DETECTION_LEARNING_OFF = read({ ...STATUS, learning: false })

const BY_HAND: SegmentStatus = {
  ...STATUS,
  version: { number: 2, byHand: true, adoptedAt: '11/3(火) 10:12' },
  lastRound: { ...NO_BETTER, verdict: 'chosenByHand' },
  versions: [
    VERSIONS[0],
    { ...VERSIONS[1], state: 'retired' },
    { ...VERSIONS[2], state: 'active', rolledBackAt: undefined },
    VERSIONS[3],
  ],
}

const NOTHING_CHECKED: SegmentStatus = {
  ...STATUS,
  version: { number: 1, byHand: false, adoptedAt: '10/18(日) 12:00' },
  evidence: {
    recordings: 0,
    boundaries: 0,
    enough: false,
    recordingsNeeded: 10,
    boundariesNeeded: 100,
  },
  metrics: undefined,
  stations: [],
  versions: FIRST_VERSION,
  lastRound: undefined,
}

export const DETECTION_BY_HAND = read(BY_HAND)

export const DETECTION_BY_HAND_LEARNING_OFF = read({
  ...BY_HAND,
  learning: false,
})

export const DETECTION_NOT_YET_EVALUATED = read({
  ...STATUS,
  version: { number: 1, byHand: false, adoptedAt: '10/18(日) 12:00' },
  evidence: {
    recordings: 4,
    boundaries: 37,
    enough: false,
    recordingsNeeded: 10,
    boundariesNeeded: 100,
  },
  metrics: undefined,
  stations: [],
  versions: FIRST_VERSION,
  lastRound: undefined,
})

export const DETECTION_BOUNDARIES_SHORT = read({
  ...STATUS,
  evidence: {
    recordings: 11,
    boundaries: 84,
    enough: false,
    recordingsNeeded: 10,
    boundariesNeeded: 100,
  },
})

export const DETECTION_WITH_OP_AND_ED = read({
  ...STATUS,
  metrics: {
    ...METRICS,
    kinds: [
      { kind: 'break', recall: 0.95 },
      { kind: 'opening', recall: 0.9 },
      { kind: 'ending' },
    ],
  },
})

export const DETECTION_NOTHING_CHECKED = read(NOTHING_CHECKED)

export const NO_LEARNING_DATA = read({
  ...NOTHING_CHECKED,
  learningData: { recordings: 0, seconds: 0, bytes: 0, waiting: 0 },
  catalog: { cm: 0, programmeFixture: 0 },
})

export const LEARNING_DATA = DETECTION_STATUS

export const LEARNING_DATA_WAITING = withLearningData({
  ...STATUS.learningData,
  waiting: 12,
})

function afterRound(
  round: SegmentRound,
  base: SegmentStatus = STATUS,
): Reading<SegmentStatus> {
  const found = round.metrics?.boundaryRecallWithin2s

  return read({
    ...base,
    evidence: round.evidence ?? base.evidence,
    lastRound: round,
    versions: base.versions.map((one) =>
      one.number === round.candidate && found !== undefined
        ? { ...one, metrics: { boundaryRecallWithin2s: found } }
        : one,
    ),
  })
}

const LEARNED = {
  takenAt: '11月8日 3:00',
  candidate: 4,
  inUse: IN_USE,
  evidence: ENOUGH,
  metrics: { boundaryRecallWithin2s: 0.94, breakRecall: 0.95 },
}

export const ROUND_NONE = read(NOTHING_CHECKED)

export const ROUND_NOTHING_NEW = read({
  ...STATUS,
  lastRound: { takenAt: '11月9日 3:02', outcome: 'nothingNew' },
  nextRound: '11月10日 3時',
})

export const ROUND_NOTHING_TO_LEARN_FROM = read({
  ...NOTHING_CHECKED,
  lastRound: { takenAt: '10月19日 3:01', outcome: 'nothingToLearnFrom' },
  nextRound: '10月20日 3時',
})

export const ROUND_EVIDENCE_SHORT = afterRound({
  ...LEARNED,
  outcome: 'kept',
  verdict: 'tooLittleEvidence',
  evidence: { ...ENOUGH, boundaries: 56, enough: false },
})

export const ROUND_IN_USE_UNCHECKED = afterRound({
  ...LEARNED,
  outcome: 'kept',
  verdict: 'tooLittleEvidence',
  inUse: undefined,
})

export const ROUND_NO_BETTER = DETECTION_STATUS

export const ROUND_ADOPTED = afterRound(
  { ...LEARNED, outcome: 'adopted', verdict: 'adopted' },
  {
    ...STATUS,
    version: { number: 4, byHand: false, adoptedAt: '11/8(日) 03:06' },
    versions: [
      { ...VERSIONS[0], state: 'active' },
      { ...VERSIONS[1], state: 'retired' },
      VERSIONS[2],
      VERSIONS[3],
    ],
  },
)

export const ROUND_HELD_AFTER_ROLLBACK = afterRound({
  ...LEARNED,
  outcome: 'heldAfterRollback',
  verdict: 'heldAfterRollback',
})

export const ROUND_CHOSEN_BY_HAND = afterRound(
  { ...LEARNED, outcome: 'kept', verdict: 'chosenByHand' },
  BY_HAND,
)

export const ROUND_IN_USE_CHANGED = afterRound(
  { ...LEARNED, outcome: 'inUseChangedMeanwhile', verdict: 'adopted' },
  BY_HAND,
)

export const ROUND_FAILED = read({
  ...STATUS,
  lastRound: { takenAt: '11月9日 3:04', outcome: 'failed' },
  nextRound: '11月10日 3時',
})

export const SEGMENT_STATUS_UNREAD: Reading<SegmentStatus> = {
  state: 'unavailable',
}

export const SEGMENT_STATUS_SIGNED_OUT: Reading<SegmentStatus> = {
  state: 'unauthenticated',
}
