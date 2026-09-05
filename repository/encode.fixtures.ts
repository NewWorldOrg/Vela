import type {
  EncodeChoices,
  EncodeDestination,
  EncodeJob,
  EncodeJobsPage,
  EncodeProfile,
  EncodeScreen,
} from '@/repository/encode'

export const VIEWING_PROFILE: EncodeProfile = {
  id: 'pf-1',
  label: '録画再生用',
  codec: 'h264',
  resolution: 'asSource',
  deinterlace: 'everyFrame',
  rateFactor: 22,
  quantiser: 24,
  definedAt: '2026/08/09 14:30',
}

export const SHELF_DESTINATION: EncodeDestination = {
  id: 'ds-1',
  label: '棚',
  outputRoot: 'encodes',
  defaultProfileId: VIEWING_PROFILE.id,
  defaultProfileLabel: VIEWING_PROFILE.label,
  definedAt: '2026/08/09 14:31',
}

export const ENCODE_CHOICES: EncodeChoices = {
  profiles: [{ id: VIEWING_PROFILE.id, label: VIEWING_PROFILE.label }],
  destinations: [
    {
      id: SHELF_DESTINATION.id,
      label: SHELF_DESTINATION.label,
      defaultProfileId: VIEWING_PROFILE.id,
    },
  ],
}

export const NO_ENCODE_CHOICES: EncodeChoices = {
  profiles: [],
  destinations: [],
}

export const MANY_ENCODE_CHOICES: EncodeChoices = {
  profiles: [
    { id: 'pf-1', label: '録画再生用' },
    { id: 'pf-2', label: '保管用' },
  ],
  destinations: [
    { id: 'ds-1', label: '棚', defaultProfileId: 'pf-1' },
    { id: 'ds-2', label: '外付け', defaultProfileId: 'pf-2' },
  ],
}

const ROW = {
  profileLabel: VIEWING_PROFILE.label,
  destinationLabel: SHELF_DESTINATION.label,
  outputRoot: 'encodes',
  attempt: 1,
  stalled: false,
  cancellable: false,
} as const

export const QUEUED_JOB: EncodeJob = {
  ...ROW,
  id: 'job-q',
  recordingId: '1210',
  title: '海辺の駅から',
  recordedAt: '08/10(日) 21:00',
  status: 'queued',
  queuedAt: '2026/08/10 22:31',
  cancellable: true,
}

export const RUNNING_JOB: EncodeJob = {
  ...ROW,
  id: 'job-r',
  recordingId: '1274',
  title: '週末キッチンの手帖',
  recordedAt: '08/09(土) 23:00',
  status: 'running',
  queuedAt: '2026/08/09 23:31',
  startedAt: '2026/08/09 23:31',
  elapsedSeconds: 461,
  headway: { percent: 42, leftSeconds: 623, at: '23:38:41' },
  route: { asked: 'software', ran: 'software' },
  cancellable: true,
}

export const STALLED_JOB: EncodeJob = {
  ...RUNNING_JOB,
  id: 'job-s',
  headway: { percent: 42, leftSeconds: 623, at: '23:26:07' },
  quietForSeconds: 754,
  stalled: true,
  route: { asked: 'vaapi', ran: 'software', swerved: 'theCardIsOutOfReach' },
}

export const COMPLETED_JOB: EncodeJob = {
  ...ROW,
  id: 'job-c',
  recordingId: '1199',
  title: 'コメット急行 #103',
  recordedAt: '08/08(金) 19:00',
  status: 'completed',
  queuedAt: '2026/08/08 20:01',
  startedAt: '2026/08/08 20:01',
  endedAt: '2026/08/08 20:19',
  headway: { percent: 100, leftSeconds: 0, at: '20:19:44' },
  route: { asked: 'software', ran: 'software' },
  artefactName: '1199.pf-1.mp4',
}

export const FAILED_JOB: EncodeJob = {
  ...ROW,
  id: 'job-f',
  recordingId: '1180',
  title: '金曜シネマ「星の渡り鳥」',
  recordedAt: '08/07(木) 21:00',
  status: 'failed',
  attempt: 2,
  queuedAt: '2026/08/07 23:01',
  startedAt: '2026/08/07 23:12',
  endedAt: '2026/08/07 23:13',
  headway: { percent: 3, leftSeconds: 6120, at: '23:13:02' },
  route: { asked: 'software', ran: 'software' },
  failure: {
    failure: 'ffmpegExitedNonZero',
    note: 'Conversion failed!',
    noticedAt: '2026/08/07 23:13',
  },
}

export const CANCELLED_JOB: EncodeJob = {
  ...ROW,
  id: 'job-x',
  recordingId: '1175',
  title: undefined,
  recordedAt: undefined,
  status: 'cancelled',
  queuedAt: '2026/08/07 20:00',
  endedAt: '2026/08/07 20:00',
}

const EVERY_JOB = [
  QUEUED_JOB,
  RUNNING_JOB,
  COMPLETED_JOB,
  FAILED_JOB,
  CANCELLED_JOB,
]

export function jobsPage(
  items: EncodeJob[],
  over: Partial<EncodeJobsPage> = {},
): EncodeJobsPage {
  return {
    items,
    total: items.length,
    page: 1,
    lastPage: 1,
    perPage: 20,
    ...over,
  }
}

export const ENCODE_SCREEN: EncodeScreen = {
  profiles: [VIEWING_PROFILE],
  destinations: [SHELF_DESTINATION],
  roots: ['encodes'],
  jobs: jobsPage(EVERY_JOB),
  running: RUNNING_JOB,
  waiting: 1,
  failed: 1,
}

export const EMPTY_ENCODE_SCREEN: EncodeScreen = {
  profiles: [],
  destinations: [],
  roots: ['encodes'],
  jobs: jobsPage([]),
  running: null,
  waiting: 0,
  failed: 0,
}

export function screenWith(
  job: EncodeJob,
  over: Partial<EncodeScreen> = {},
): EncodeScreen {
  return {
    ...ENCODE_SCREEN,
    jobs: jobsPage([job]),
    running: job.status === 'running' ? job : null,
    waiting: job.status === 'queued' ? 1 : 0,
    failed: job.status === 'failed' ? 1 : 0,
    ...over,
  }
}

export const MORE_JOBS_THAN_FIT: EncodeScreen = {
  ...ENCODE_SCREEN,
  running: null,
  waiting: 0,
  failed: 0,
  jobs: jobsPage(
    Array.from({ length: 24 }, (_, index) => ({
      ...COMPLETED_JOB,
      id: `job-c-${index + 1}`,
      queuedAt: `2026/08/${String(1 + (index % 28)).padStart(2, '0')} 20:01`,
    })),
    { total: 64, lastPage: 3, page: 2 },
  ),
}
