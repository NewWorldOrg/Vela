export interface FailureClass {
  no: 1 | 2 | 3 | 4
  label: string
}

export const NO_LOCK: FailureClass = {
  no: 1,
  label: '信号を掴めない',
}

export const LOCKED_WITHOUT_DATA: FailureClass = {
  no: 2,
  label: 'データが来ない',
}

export const INCOMPLETE_TABLES: FailureClass = {
  no: 3,
  label: '情報が揃わない',
}

export const UNEXPECTED_STREAM: FailureClass = {
  no: 4,
  label: '内容が食い違う',
}

const CIRCLED = { 1: '①', 2: '②', 3: '③', 4: '④' } as const

export function numbered(failure: FailureClass): string {
  return `${CIRCLED[failure.no]} ${failure.label}`
}

export const FAILURE_CLASSES: FailureClass[] = [
  NO_LOCK,
  LOCKED_WITHOUT_DATA,
  INCOMPLETE_TABLES,
  UNEXPECTED_STREAM,
]
