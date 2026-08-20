/**
 * The point of the domain: a scan that gets nowhere is four different
 * problems, and which one it is says where to go looking. The numbers are
 * the operator's shorthand and are shown beside every one of them.
 *
 * They are named on screen as often as they are counted from a scan, so they
 * sit apart from the reading: a Client Component may hold them, and nothing
 * that reaches the API comes with them.
 */
export interface FailureClass {
  /** 1–4, the order the four are always listed in. */
  no: 1 | 2 | 3 | 4
  label: string
  note: string
}

export const NO_LOCK: FailureClass = {
  no: 1,
  label: '信号を掴めない',
  note: 'チューナーが同調できない',
}

export const LOCKED_WITHOUT_DATA: FailureClass = {
  no: 2,
  label: 'データが来ない',
  note: '同調したが受信データなし',
}

export const INCOMPLETE_TABLES: FailureClass = {
  no: 3,
  label: '情報が揃わない',
  note: 'データはあるが番組情報が不完全',
}

export const UNEXPECTED_STREAM: FailureClass = {
  no: 4,
  label: '内容が食い違う',
  note: '期待と異なる局(再編の可能性)',
}

export const FAILURE_CLASSES: FailureClass[] = [
  NO_LOCK,
  LOCKED_WITHOUT_DATA,
  INCOMPLETE_TABLES,
  UNEXPECTED_STREAM,
]
