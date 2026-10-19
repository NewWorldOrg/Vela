import { LOGO_FULL_COLOUR } from '@/repository/logos.fixtures'
import type {
  LearningData,
  SegmentMetrics,
  SegmentStatus,
  SegmentVersion,
} from '@/repository/segment-status'
import type { Reading } from '@/repository/system'

const VERSIONS: SegmentVersion[] = [
  {
    number: 4,
    state: 'candidate',
    trainedAt: '11/8(日) 03:00',
    metrics: { boundaryRecallWithin2s: 0.94 },
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
  evidence: {
    recordings: 12,
    boundaries: 148,
    enough: true,
    recordingsNeeded: 10,
    boundariesNeeded: 100,
  },
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

export const SEGMENT_STATUS_UNREAD: Reading<SegmentStatus> = {
  state: 'unavailable',
}

export const SEGMENT_STATUS_SIGNED_OUT: Reading<SegmentStatus> = {
  state: 'unauthenticated',
}
