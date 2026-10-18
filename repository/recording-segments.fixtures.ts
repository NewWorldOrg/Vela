import type {
  RecordingSegment,
  RecordingSegments,
} from '@/repository/recording-segments'

const LENGTH = 30 * 60 + 4

const DETECTED_STRETCHES: RecordingSegment[] = [
  { startsAtSec: 0, endsAtSec: 412.3, kind: 'programme' },
  { startsAtSec: 412.3, endsAtSec: 502.3, kind: 'break' },
  { startsAtSec: 502.3, endsAtSec: 1175.6, kind: 'programme' },
  { startsAtSec: 1175.6, endsAtSec: 1265.6, kind: 'break' },
  { startsAtSec: 1265.6, endsAtSec: LENGTH, kind: 'programme' },
]

const ANSWERED_STRETCHES: RecordingSegment[] = [
  { startsAtSec: 0, endsAtSec: 412.28, kind: 'programme' },
  { startsAtSec: 412.28, endsAtSec: 502.3, kind: 'break' },
  { startsAtSec: 502.3, endsAtSec: 1175.6, kind: 'programme' },
  { startsAtSec: 1175.6, endsAtSec: 1295.6, kind: 'break' },
  { startsAtSec: 1295.6, endsAtSec: LENGTH, kind: 'programme' },
]

const SNAPS = [412.28, 412.31, 502.3, 840, 1175.6, 1265.6, 1295.6]

export const DETECTED_SEGMENTS: RecordingSegments = {
  lengthSec: LENGTH,
  source: 'detected',
  modelVersion: 3,
  confirmed: false,
  segments: DETECTED_STRETCHES,
  snaps: SNAPS,
}

export const ANSWERED_SEGMENTS: RecordingSegments = {
  lengthSec: LENGTH,
  source: 'answered',
  confirmed: false,
  segments: ANSWERED_STRETCHES,
  snaps: SNAPS,
}

export const CONFIRMED_SEGMENTS: RecordingSegments = {
  ...ANSWERED_SEGMENTS,
  confirmed: true,
}

export const NO_SEGMENTS: RecordingSegments = {
  lengthSec: LENGTH,
  source: 'none',
  confirmed: false,
  segments: [],
  snaps: [],
}

export const NOTHING_FOUND_SEGMENTS: RecordingSegments = {
  lengthSec: LENGTH,
  source: 'detected',
  modelVersion: 3,
  confirmed: false,
  segments: [{ startsAtSec: 0, endsAtSec: LENGTH, kind: 'programme' }],
  snaps: [],
}

export const UNKNOWN_KIND_SEGMENTS: RecordingSegments = {
  ...DETECTED_SEGMENTS,
  segments: [
    { startsAtSec: 0, endsAtSec: 90, kind: 'unknown' },
    ...DETECTED_STRETCHES.map((one, nth) =>
      nth === 0 ? { ...one, startsAtSec: 90 } : one,
    ),
  ],
}
