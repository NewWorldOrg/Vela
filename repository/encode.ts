import { ENCODE } from '@/repository/encode.fixtures'

export interface EncodeRunningJob {
  id: string
  title: string
  recordedAt: string
  progressPct: number
  elapsed: string
  remaining: string
  cores: string
}

export interface EncodeFailure {
  id: string
  title: string
  body: string
  classification: string
  tone: 'err' | 'warn'
}

export interface EncodeProfile {
  id: string
  name: string
  codec: 'H.264' | 'H.265'
  resolution: string
  crf: string
  deinterlace: string
  output: string
}

export interface EncodeResult {
  running: EncodeRunningJob | null
  waiting: number
  failed: number
  averageMinutes: string
  averageNote: string
  concurrency: string
  concurrencyNote: string
  failures: EncodeFailure[]
  profiles: EncodeProfile[]
  editing: EncodeProfile
  lastSavedAt: string
  autoEncode: {
    enabled: boolean
    target: string
    coreLimit: string
    concurrency: string
  }
}

export async function getEncode(): Promise<EncodeResult> {
  return ENCODE
}
