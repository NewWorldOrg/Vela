import { LOGO_FULL_COLOUR } from '@/repository/logos.fixtures'
import type {
  LearningData,
  SegmentStatus,
  SegmentVersion,
} from '@/repository/segment-status'
import type { Reading } from '@/repository/system'

const VERSIONS: SegmentVersion[] = [
  {
    number: 4,
    state: 'candidate',
    trainedAt: '11/8(日) 03:00',
    metrics: {
      boundaryRecallWithin2s: 0.94,
      programmeSkippedSecondsPerHour: 3.6,
    },
  },
  {
    number: 3,
    state: 'active',
    trainedAt: '11/1(日) 03:00',
    metrics: {
      boundaryRecallWithin2s: 0.93,
      programmeSkippedSecondsPerHour: 2.1,
    },
  },
  {
    number: 2,
    state: 'retired',
    trainedAt: '10/25(日) 03:00',
    rolledBackAt: '10/28(水) 21:40',
    metrics: {
      boundaryRecallWithin2s: 0.95,
      programmeSkippedSecondsPerHour: 2.4,
    },
  },
  { number: 1, state: 'retired', trainedAt: '10/18(日) 12:00' },
]

const FIRST_VERSION: SegmentVersion[] = [
  { number: 1, state: 'active', trainedAt: '10/18(日) 12:00' },
]

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
    confirmedRecordings: 12,
    boundaries: 148,
    enough: true,
    recordingsNeeded: 10,
    boundariesNeeded: 100,
  },
  metrics: {
    boundaryRecallWithin2s: 0.93,
    boundaryRecallWithin1s: 0.85,
    extraBoundariesPerRecording: 1.2,
    programmeSkippedSecondsPerHour: 2.1,
    returnedAfterSkipping: 0.03,
  },
  stations: [
    {
      key: '1-101',
      name: '湾岸放送1',
      no: '1',
      logo: LOGO_FULL_COLOUR,
      confirmedRecordings: 5,
      metrics: {
        boundaryRecallWithin2s: 0.96,
        programmeSkippedSecondsPerHour: 1.4,
      },
    },
    {
      key: '1-104',
      name: '第一テレビ1',
      no: '4',
      confirmedRecordings: 4,
      metrics: {
        boundaryRecallWithin2s: 0.91,
        programmeSkippedSecondsPerHour: 2.6,
      },
    },
    {
      key: '1-106',
      name: '港町テレビ',
      no: '6',
      confirmedRecordings: 3,
      metrics: { programmeSkippedSecondsPerHour: 2.5 },
    },
  ],
  versions: VERSIONS,
  skipThreshold: { current: 0.7, recommended: 0.65 },
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

const NOTHING_CONFIRMED: SegmentStatus = {
  ...STATUS,
  version: { number: 1, byHand: false, adoptedAt: '10/18(日) 12:00' },
  evidence: {
    confirmedRecordings: 0,
    boundaries: 0,
    enough: false,
    recordingsNeeded: 10,
    boundariesNeeded: 100,
  },
  metrics: undefined,
  stations: [],
  versions: FIRST_VERSION,
  skipThreshold: { current: 0.7 },
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
    confirmedRecordings: 4,
    boundaries: 37,
    enough: false,
    recordingsNeeded: 10,
    boundariesNeeded: 100,
  },
  metrics: undefined,
  stations: [],
  versions: FIRST_VERSION,
  skipThreshold: { current: 0.7 },
})

export const DETECTION_BOUNDARIES_SHORT = read({
  ...STATUS,
  evidence: {
    confirmedRecordings: 11,
    boundaries: 84,
    enough: false,
    recordingsNeeded: 10,
    boundariesNeeded: 100,
  },
})

export const DETECTION_NOTHING_CONFIRMED = read(NOTHING_CONFIRMED)

export const NO_LEARNING_DATA = read({
  ...NOTHING_CONFIRMED,
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
