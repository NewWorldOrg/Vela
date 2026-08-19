/**
 * The event hub is one SSE endpoint carrying named, payload-free signals; a
 * signal says "re-read", never what changed. The names below are the ones the
 * guide listens to.
 */
export const APP_EVENTS_PATH = '/api/events'

export const PROGRAMS_EVENT = 'programs'

export const EPG_COLLECTION_EVENT = 'epgCollection'
