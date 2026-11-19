import { MOST_URL, lineAddressOf } from '@/lib/bml/paths'
import { boundaryOf, type BoundaryPair } from '@/lib/hybridcast/boundary'

export const CONTROL_CODE = {
  autostart: 1,
  present: 2,
  kill: 4,
} as const

const CONTROL_CODES: ReadonlySet<number> = new Set(Object.values(CONTROL_CODE))

export const HTML5_APPLICATION = 0x0010

export const MOST_APPLICATIONS = 32

const MOST_ORG_ID = 0xffffffff

const MOST_APP_ID = 0xffff

const HEX_ID = /^[0-9a-f]{1,8}$/i

export interface AitApplication {
  orgId: number
  appId: number
  controlCode: number
  entryUrl: string
  boundary?: BoundaryPair[]
}

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

export function isAitUri(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MOST_URL &&
    lineAddressOf(value)?.url === value
  )
}

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

  const boundary =
    application.boundary === undefined
      ? undefined
      : boundaryOf(application.boundary)

  if (boundary === null) {
    return null
  }

  return {
    orgId: application.orgId,
    appId: application.appId,
    controlCode: application.controlCode as number,
    entryUrl: application.entryUrl,
    ...(boundary ? { boundary } : {}),
  }
}

export function aitApplicationsOf(value: unknown): AitApplication[] | null {
  const applications = recordOf(value)?.applications

  if (!Array.isArray(applications) || applications.length > MOST_APPLICATIONS) {
    return null
  }

  const read = applications.map(applicationOf)

  return read.every((one) => one !== null) ? (read as AitApplication[]) : null
}

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
