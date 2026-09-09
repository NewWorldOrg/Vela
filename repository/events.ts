export const APP_EVENTS_PATH = '/api/events'

export const PROGRAMS_EVENT = 'programs'

export const EPG_COLLECTION_EVENT = 'epgCollection'

export const RESERVATIONS_EVENT = 'reservations'

export const RULES_EVENT = 'rules'

export const RECORDINGS_EVENT = 'recordings'

export const QUALITY_EVENT = 'quality'

export const ENCODE_JOBS_EVENT = 'encodeJobs'

export type AppEvent =
  | typeof PROGRAMS_EVENT
  | typeof EPG_COLLECTION_EVENT
  | typeof RESERVATIONS_EVENT
  | typeof RULES_EVENT
  | typeof RECORDINGS_EVENT
  | typeof QUALITY_EVENT
  | typeof ENCODE_JOBS_EVENT
