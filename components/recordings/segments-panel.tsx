'use client'

import { useId, useState, useTransition, type KeyboardEvent } from 'react'

import { cn } from '@/lib/utils'
import { wordFor } from '@/lib/not-yet-in-this-build'
import { EMPTY_VALUE } from '@/lib/empty-value'
import {
  answerOf,
  boundaryMoved,
  formatSegmentAt,
  formatSegmentField,
  formatSegmentLength,
  kindChanged,
  readSegmentField,
  removedAt,
  sameSegments,
  snapped,
  splitAt,
  splittableAt,
} from '@/lib/segment-edits'
import {
  CONFIRMED,
  SEGMENTS_HEADING,
  SEGMENTS_NOT_SAVED,
  SEGMENTS_SIGNED_OUT,
  SEGMENT_ACTION,
  SEGMENT_COLUMN,
  SEGMENT_KINDS,
  SEGMENT_KIND_LABEL,
  WITHDRAWING,
  WITHDRAW_FAILED,
  WITHDRAW_SIGNED_OUT,
} from '@/lib/segment-terms'
import type { WatchLink } from '@/lib/watch-link'
import type {
  AnsweredSegment,
  RecordingSegment,
  RecordingSegments,
  SegmentKind,
  SegmentsWrite,
} from '@/repository/recording-segments'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ActionRow } from '@/components/vela/action-row'
import { InlineAlert } from '@/components/vela/banner'
import { ChevronRightIcon, SegmentsIcon } from '@/components/vela/icons'
import { Spinner } from '@/components/vela/progress'
import { SegmentsBand } from '@/components/recordings/segments-band'
import {
  useFollows,
  usePlayhead,
  useWatchLink,
} from '@/components/recordings/watch-link-seat'

export type AnswerSegments = (
  id: string,
  segments: AnsweredSegment[],
  confirmed: boolean,
) => Promise<SegmentsWrite>

export type WithdrawSegmentAnswer = (id: string) => Promise<SegmentsWrite>

type Pressed = 'save' | 'confirm'

const NUMBER = 'font-code tabular-nums'

function SplitHere({
  link,
  segments,
  disabled,
  onSplit,
}: {
  link: WatchLink | undefined
  segments: readonly RecordingSegment[]
  disabled: boolean
  onSplit: (second: number) => void
}) {
  const playhead = usePlayhead(link)

  if (playhead === undefined) {
    return null
  }

  return (
    <Button
      type="button"
      variant="change"
      size="sm"
      className="ml-auto"
      disabled={disabled || splittableAt(segments, playhead) === undefined}
      onClick={() => onSplit(playhead)}
    >
      {SEGMENT_ACTION.split}
    </Button>
  )
}

/** A boundary typed as a position: kept as typed while the field is used, and put in place, drawn to a candidate, when it is left. */
function BoundaryField({
  second,
  snaps,
  disabled,
  onMove,
}: {
  second: number
  snaps: readonly number[]
  disabled: boolean
  onMove: (second: number) => void
}) {
  const [shown, setShown] = useState(second)
  const [text, setText] = useState(() => formatSegmentField(second))

  if (second !== shown) {
    setShown(second)
    setText(formatSegmentField(second))
  }

  const place = () => {
    const typed = readSegmentField(text)

    if (typed === undefined) {
      setText(formatSegmentField(second))

      return
    }

    onMove(snapped(typed, snaps))
    setText(formatSegmentField(second))
  }

  return (
    <Input
      aria-label={SEGMENT_COLUMN.starts}
      inputMode="decimal"
      autoComplete="off"
      areaClassName="w-[calc(118rem/16)]"
      className={cn('h-8', NUMBER)}
      value={text}
      readOnly={disabled}
      onChange={(event) => setText(event.target.value)}
      onBlur={place}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          place()
        }
      }}
    />
  )
}

function SegmentRow({
  segment,
  nth,
  count,
  editing,
  follows,
  snaps,
  pending,
  onSeek,
  onMove,
  onKind,
  onRemove,
}: {
  segment: RecordingSegment
  nth: number
  count: number
  editing: boolean
  follows: boolean
  snaps: readonly number[]
  pending: boolean
  onSeek: (second: number) => void
  onMove: (nth: number, second: number) => void
  onKind: (nth: number, kind: SegmentKind) => void
  onRemove: (nth: number) => void
}) {
  const seek = () => onSeek(segment.startsAtSec)
  const held = (event: { stopPropagation: () => void }) =>
    event.stopPropagation()

  return (
    <TableRow
      data-pressable-row={follows && !editing ? '' : undefined}
      tabIndex={follows && !editing ? 0 : undefined}
      onClick={follows ? seek : undefined}
      onKeyDown={
        follows && !editing
          ? (event: KeyboardEvent<HTMLTableRowElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                seek()
              }
            }
          : undefined
      }
      className={cn(
        follows &&
          'cursor-pointer hover:bg-surface-2 focus-visible:shadow-ring focus-visible:outline-none',
      )}
    >
      <TableCell onClick={editing ? held : undefined}>
        {editing && segment.kind !== 'unknown' ? (
          <Select
            value={segment.kind}
            disabled={pending}
            onValueChange={(next) => onKind(nth, next as SegmentKind)}
          >
            <SelectTrigger
              size="sm"
              aria-label={SEGMENT_COLUMN.kind}
              className="w-[calc(96rem/16)]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEGMENT_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {wordFor(SEGMENT_KIND_LABEL, kind)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="font-bold">
            {segment.kind === 'unknown'
              ? EMPTY_VALUE
              : wordFor(SEGMENT_KIND_LABEL, segment.kind)}
          </span>
        )}
      </TableCell>
      <TableCell
        className={NUMBER}
        onClick={editing && nth > 0 ? held : undefined}
      >
        {editing && nth > 0 ? (
          <BoundaryField
            second={segment.startsAtSec}
            snaps={snaps}
            disabled={pending}
            onMove={(second) => onMove(nth, second)}
          />
        ) : (
          formatSegmentAt(segment.startsAtSec)
        )}
      </TableCell>
      <TableCell className={NUMBER}>
        {formatSegmentAt(segment.endsAtSec)}
      </TableCell>
      <TableCell className={cn(NUMBER, 'text-ink-2')}>
        {formatSegmentLength(segment)}
      </TableCell>
      {editing && (
        <TableCell className="text-right" onClick={held}>
          {count > 1 && (
            <Button
              type="button"
              variant="remove"
              size="sm"
              disabled={pending}
              onClick={() => onRemove(nth)}
            >
              {SEGMENT_ACTION.remove}
            </Button>
          )}
        </TableCell>
      )}
    </TableRow>
  )
}

/**
 * The stretches of a recording under its player: the whole recording as a strip and the stretches as a list,
 * both of which seek the player when pressed. Changing them moves a boundary by its grip or its field, splits a
 * stretch where the playhead stands, takes a stretch into its neighbour and changes a stretch's kind; what is
 * saved, confirmed or withdrawn comes back from the backend and replaces what is drawn, and the player plans
 * its chapters again from it.
 */
export function SegmentsPanel({
  recordingId,
  reading,
  onAnswer,
  onWithdraw,
}: {
  recordingId: string
  reading: RecordingSegments
  onAnswer: AnswerSegments
  onWithdraw: WithdrawSegmentAnswer
}) {
  const link = useWatchLink()
  const follows = useFollows(link)
  const headingId = useId()
  const bodyId = useId()
  const [open, setOpen] = useState(false)
  const [given, setGiven] = useState(reading)
  const [shown, setShown] = useState(reading)
  const [draft, setDraft] = useState<RecordingSegment[]>()
  const [arrived, setArrived] = useState<RecordingSegments>()
  const [refusal, setRefusal] = useState<string>()
  const [pressed, setPressed] = useState<Pressed>()
  const [pending, startTransition] = useTransition()
  const [asking, setAsking] = useState(false)
  const [withdrawRefusal, setWithdrawRefusal] = useState<string>()

  if (reading !== given) {
    setGiven(reading)

    if (draft === undefined) {
      setShown(reading)
      link?.standsWith(reading.modelVersion)
    } else {
      setArrived(reading)
    }
  }

  if (shown.segments.length === 0) {
    return null
  }

  const editing = draft !== undefined
  const segments = draft ?? shown.segments
  const answerable = answerOf(shown.segments) !== undefined
  const changed = draft !== undefined && !sameSegments(draft, shown.segments)

  const took = (answered: RecordingSegments) => {
    setShown(answered)
    setArrived(undefined)
    setRefusal(undefined)
    link?.standsWith(answered.modelVersion)
    link?.replan()
  }

  const send = (
    from: readonly RecordingSegment[],
    confirmed: boolean,
    what: Pressed,
  ) => {
    const answer = answerOf(from)

    if (!answer || pending) {
      return
    }

    setPressed(what)
    startTransition(async () => {
      const result = await onAnswer(recordingId, answer, confirmed)

      if (result.state === 'ok') {
        took(result.segments)

        if (what === 'save') {
          setDraft(undefined)
        }

        return
      }

      setRefusal(
        result.state === 'unauthenticated'
          ? SEGMENTS_SIGNED_OUT
          : SEGMENTS_NOT_SAVED[result.refusal],
      )
    })
  }

  const withdraw = () => {
    if (pending) {
      return
    }

    startTransition(async () => {
      setWithdrawRefusal(undefined)

      const result = await onWithdraw(recordingId)

      if (result.state === 'ok') {
        setAsking(false)
        took(result.segments)

        return
      }

      setWithdrawRefusal(
        result.state === 'unauthenticated'
          ? WITHDRAW_SIGNED_OUT
          : WITHDRAW_FAILED,
      )
    })
  }

  const redraft = (next: RecordingSegment[]) => setDraft(next)

  const leave = () => {
    setDraft(undefined)
    setRefusal(undefined)

    if (arrived) {
      setShown(arrived)
      setArrived(undefined)
      link?.standsWith(arrived.modelVersion)
    }
  }

  return (
    <section
      data-slot="recording-segments"
      aria-labelledby={headingId}
      className="mt-[calc(22rem/16)] rounded-xl bg-surface px-[calc(22rem/16)]"
    >
      <div className="flex flex-wrap items-center gap-x-[calc(9rem/16)] gap-y-2 py-[calc(11rem/16)]">
        <h2 id={headingId}>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={open ? bodyId : undefined}
            data-open={open ? '' : undefined}
            onClick={() => setOpen(!open)}
            className="tap-target group flex cursor-pointer items-center gap-[calc(9rem/16)] py-1 text-ui font-bold text-ink-2 transition-colors duration-150 ease-out hover:text-ink focus-visible:shadow-ring focus-visible:outline-none"
          >
            <ChevronRightIcon className="size-[calc(15rem/16)] text-brand transition-transform duration-150 ease-toy group-data-[open]:rotate-90" />
            <SegmentsIcon className="size-[calc(15rem/16)] text-brand" />
            {SEGMENTS_HEADING}
          </button>
        </h2>
        {shown.confirmed && <Badge variant="ok">{CONFIRMED}</Badge>}
        {open && editing && (
          <SplitHere
            link={link}
            segments={segments}
            disabled={pending}
            onSplit={(second) => redraft(splitAt(segments, second))}
          />
        )}
        {open && !editing && answerable && (
          <ActionRow className="ml-auto">
            <Button
              type="button"
              variant="change"
              size="sm"
              disabled={pending}
              onClick={() => {
                setRefusal(undefined)
                setDraft(shown.segments)
              }}
            >
              {SEGMENT_ACTION.change}
            </Button>
            <Button
              type="button"
              variant={shown.confirmed ? 'halt' : 'change'}
              size="sm"
              disabled={pending}
              onClick={() => send(shown.segments, !shown.confirmed, 'confirm')}
            >
              {pending && pressed === 'confirm' && <Spinner size="control" />}
              {shown.confirmed
                ? SEGMENT_ACTION.unconfirm
                : SEGMENT_ACTION.confirm}
            </Button>
            {shown.source === 'answered' && (
              <Button
                type="button"
                variant="halt"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setWithdrawRefusal(undefined)
                  setAsking(true)
                }}
              >
                {SEGMENT_ACTION.withdraw}
              </Button>
            )}
          </ActionRow>
        )}
      </div>
      {open && (
        <div
          id={bodyId}
          className="border-t border-dashed border-line pt-4 pb-5"
        >
          <div aria-live="polite">
            {refusal && (
              <InlineAlert tone="warn" className="mb-3">
                {refusal}
              </InlineAlert>
            )}
          </div>
          <SegmentsBand
            lengthSec={shown.lengthSec}
            segments={segments}
            snaps={shown.snaps}
            link={link}
            follows={follows}
            editing={editing}
            onMove={(nth, second) =>
              redraft(boundaryMoved(segments, nth, second))
            }
          />
          <Table className="w-auto" containerClassName="mt-3.5">
            <TableHeader>
              <TableRow>
                <TableHead>{SEGMENT_COLUMN.kind}</TableHead>
                <TableHead>{SEGMENT_COLUMN.starts}</TableHead>
                <TableHead>{SEGMENT_COLUMN.ends}</TableHead>
                <TableHead>{SEGMENT_COLUMN.length}</TableHead>
                {editing && (
                  <TableHead>
                    <span className="sr-only">操作</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.map((one, nth) => (
                <SegmentRow
                  key={nth}
                  segment={one}
                  nth={nth}
                  count={segments.length}
                  editing={editing}
                  follows={follows}
                  snaps={shown.snaps}
                  pending={pending}
                  onSeek={(second) => link?.seek(second)}
                  onMove={(at, second) =>
                    redraft(boundaryMoved(segments, at, second))
                  }
                  onKind={(at, kind) =>
                    redraft(kindChanged(segments, at, kind))
                  }
                  onRemove={(at) => redraft(removedAt(segments, at))}
                />
              ))}
            </TableBody>
          </Table>
          {editing && (
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2.5 border-t border-dashed border-line pt-3">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={leave}
              >
                {SEGMENT_ACTION.cancel}
              </Button>
              <Button
                type="button"
                disabled={!changed || pending}
                onClick={() => draft && send(draft, shown.confirmed, 'save')}
              >
                {pending && pressed === 'save' && <Spinner size="control" />}
                保存する
              </Button>
            </div>
          )}
        </div>
      )}
      {shown.source === 'answered' && (
        <AlertDialog
          open={asking}
          onOpenChange={(next) => {
            if (!next) {
              setWithdrawRefusal(undefined)
            }

            setAsking(next)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{WITHDRAWING.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {WITHDRAWING.body}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <span aria-live="polite">
              {withdrawRefusal && (
                <InlineAlert tone="warn">{withdrawRefusal}</InlineAlert>
              )}
            </span>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>
                {SEGMENT_ACTION.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="default"
                disabled={pending}
                onClick={(event) => {
                  event.preventDefault()
                  withdraw()
                }}
              >
                {pending && <Spinner size="control" />}
                {WITHDRAWING.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </section>
  )
}
