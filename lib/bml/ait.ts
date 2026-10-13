import { MOST_URL, lineAddressOf } from '@/lib/bml/paths'

/** The control codes an AIT gives an application, of those this receiver reads (IPTVFJ STD-0013 4.1.4). */
export const CONTROL_CODE = {
  autostart: 1,
  present: 2,
  kill: 4,
} as const

const CONTROL_CODES: ReadonlySet<number> = new Set(Object.values(CONTROL_CODE))

/** The application type `getReceivedAIT` answers first: an HTML5 application (IPTVFJ STD-0010 appendix A.1). */
export const HTML5_APPLICATION = 0x0010

/** The most applications one AIT is taken with. */
export const MOST_APPLICATIONS = 32

const MOST_ORG_ID = 0xffffffff

const MOST_APP_ID = 0xffff

const HEX_ID = /^[0-9a-f]{1,8}$/i

/** One application an AIT names, as Carina read it: the organisation and application identifiers, the control code and the URL it is entered at. */
export interface AitApplication {
  orgId: number
  appId: number
  controlCode: number
  entryUrl: string
}

/** What a document asks the player to start: the AIT by its URL, and the application in it by both identifiers. */
export interface AppStart {
  ait: string
  orgId: number
  appId: number
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function within(value: unknown, least: number, most: number): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) >= least &&
    (value as number) <= most
  )
}

/** A URL of the line as it is written: `http:` or `https:`, without a fragment. */
export function isAitUri(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MOST_URL &&
    lineAddressOf(value)?.url === value
  )
}

/** An identifier as a document writes it, in hexadecimal without `0x` or `h`, or null when it is not one. */
export function hexIdOf(value: unknown): number | null {
  return typeof value === 'string' && HEX_ID.test(value)
    ? parseInt(value, 16)
    : null
}

function applicationOf(value: unknown): AitApplication | null {
  const application = recordOf(value)

  if (
    !application ||
    !within(application.orgId, 1, MOST_ORG_ID) ||
    !within(application.appId, 0, MOST_APP_ID) ||
    !CONTROL_CODES.has(application.controlCode as number) ||
    !isAitUri(application.entryUrl)
  ) {
    return null
  }

  return {
    orgId: application.orgId,
    appId: application.appId,
    controlCode: application.controlCode as number,
    entryUrl: application.entryUrl,
  }
}

/** The applications of an AIT as Carina answers them, `{ applications: [...] }`, or null when the answer has another shape. */
export function aitApplicationsOf(value: unknown): AitApplication[] | null {
  const applications = recordOf(value)?.applications

  if (!Array.isArray(applications) || applications.length > MOST_APPLICATIONS) {
    return null
  }

  const read = applications.map(applicationOf)

  return read.every((one) => one !== null) ? (read as AitApplication[]) : null
}

/** A start in the shape the player takes, or null. */
export function appStartOf(value: unknown): AppStart | null {
  const start = recordOf(value)

  return start &&
    isAitUri(start.ait) &&
    within(start.orgId, 1, MOST_ORG_ID) &&
    within(start.appId, 0, MOST_APP_ID)
    ? { ait: start.ait, orgId: start.orgId, appId: start.appId }
    : null
}

export function sameStart(one: AppStart, other: AppStart): boolean {
  return (
    one.ait === other.ait &&
    one.orgId === other.orgId &&
    one.appId === other.appId
  )
}

/** The application both identifiers name, when it is one to start by itself (IPTVFJ STD-0010 7.5.2.3), or null. */
export function applicationToStart(
  applications: readonly AitApplication[],
  orgId: number,
  appId: number,
): AitApplication | null {
  return (
    applications.find(
      (application) =>
        application.orgId === orgId &&
        application.appId === appId &&
        application.controlCode === CONTROL_CODE.autostart,
    ) ?? null
  )
}

/** What `getReceivedAIT` answers for an AIT that was read: the application type, then each application's identifiers in hexadecimal, its control code and its entry (IPTVFJ STD-0010 appendix A.1). */
export function receivedAitOf(
  applications: readonly AitApplication[],
): unknown[][] {
  return [
    [HTML5_APPLICATION],
    ...applications.map((application) => [
      application.orgId.toString(16),
      application.appId.toString(16),
      application.controlCode,
      application.entryUrl,
    ]),
  ]
}
