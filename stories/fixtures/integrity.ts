import type { IntegrityResult } from '@/repository/integrity'

const CHECK = {
  ranAt: '08/08 03:10',
  rootsWalked: 2,
  rootsOutOfReach: 0,
  filesRead: 214,
  ledgerRowsRead: 212,
  ledgerRowsJudged: 211,
  ledgerRowsStillWriting: 1,
  ledgerRowsInRootsOutOfReach: 0,
}

const ROOTS = [
  {
    name: 'primary',
    free: '127,048,298,496 B',
    total: '481,493,131,264 B',
    writable: true,
    recordingsInFlight: 1,
  },
]

/** One of each fault the sweep can raise, so every row shape is drawn once. */
export const INTEGRITY_FIXTURE: IntegrityResult = {
  check: CHECK,
  total: 5,
  roots: ROOTS,
  findings: [
    {
      key: 'primary/recording-4812.m2ts.tmp',
      fault: 'noLedgerRow',
      reason: '録画の記録に対応する行が無い',
      root: 'primary',
      path: 'recording-4812.m2ts.tmp',
      size: '2,514,911,344 B',
      noticedAt: '08/08 03:10',
    },
    {
      key: 'primary/recording-4790.m2ts',
      fault: 'sizeDisagrees',
      reason: '録画の記録とサイズが食い違う',
      root: 'primary',
      path: 'recording-4790.m2ts',
      recordingId: '4790',
      size: '8,142,336 B',
      sizeNote: '録画の記録では 22,331,551,744 B',
      noticedAt: '08/08 03:10',
    },
    {
      key: 'primary/recording-4771.m2ts',
      fault: 'fileEmpty',
      reason: '0 バイト',
      root: 'primary',
      path: 'recording-4771.m2ts',
      recordingId: '4771',
      size: '0 B',
      sizeNote: '録画の記録では 20,796,506,112 B',
      noticedAt: '08/08 03:10',
    },
    {
      key: 'primary/recording-4768.m2ts',
      fault: 'emptyThoughComplete',
      reason: '0 バイト(録画は完走している)',
      root: 'primary',
      path: 'recording-4768.m2ts',
      recordingId: '4768',
      size: '0 B',
      sizeNote: '録画の記録では 18,203,443,200 B',
      noticedAt: '08/08 03:10',
    },
    {
      key: 'secondary/recording-4702.m2ts',
      fault: 'fileMissing',
      reason: '録画の記録に行があるが実ファイルが無い',
      root: 'secondary',
      path: 'recording-4702.m2ts',
      recordingId: '4702',
      size: '—',
      sizeNote: '録画の記録では 15,032,385,536 B',
      noticedAt: '08/08 03:10',
    },
  ],
}

export const INTEGRITY_CLEAR_FIXTURE: IntegrityResult = {
  check: CHECK,
  total: 0,
  roots: ROOTS,
  findings: [],
}
