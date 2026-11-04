'use client'

import { useState, useTransition } from 'react'

import {
  MARGIN_RANGE,
  PRIORITY_RANGE,
  wholeNumber,
  withinMargin,
  withinPriority,
} from '@/lib/reservations'
import { signedOut } from '@/lib/signed-out'
import type {
  ReservationRevision,
  ReservationWrite,
} from '@/repository/reservations'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { InlineAlert } from '@/components/vela/banner'
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
  RequiredMark,
} from '@/components/vela/field'
import { Stepper } from '@/components/reservations/stepper'

type Named = 'priority' | 'before' | 'after'

const SIGNED_OUT = signedOut('操作')

const MARGIN_STEP = 10

const NOTHING_CHANGED = '変える値がありません。どれかを書き換えてください。'

export interface Booking {
  id: string
  title: string
  priority: number
  marginBeforeSeconds: number
  marginAfterSeconds: number
  encodeWhenRecorded: boolean
}

export function EditReservationDialog({
  booking,
  open,
  onOpenChange,
  onRevise,
  layout = 'dialog',
}: {
  /**
   * `dialog` opens over the screen; `row` is drawn across the reservation it changes, under its row in the list; `stack`
   * puts the fields one under another, under a row on a phone.
   */
  layout?: 'dialog' | 'row' | 'stack'
  booking: Booking
  open: boolean
  onOpenChange: (open: boolean) => void
  onRevise: (
    id: string,
    revision: ReservationRevision,
  ) => Promise<ReservationWrite>
}) {
  const [priority, setPriority] = useState(String(booking.priority))
  const [before, setBefore] = useState(String(booking.marginBeforeSeconds))
  const [after, setAfter] = useState(String(booking.marginAfterSeconds))
  const [encode, setEncode] = useState(booking.encodeWhenRecorded)
  const [problem, setProblem] = useState<{ field: Named; text: string }>()
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  const close = (next: boolean) => {
    if (!next) {
      setPriority(String(booking.priority))
      setBefore(String(booking.marginBeforeSeconds))
      setAfter(String(booking.marginAfterSeconds))
      setEncode(booking.encodeWhenRecorded)
      setProblem(undefined)
      setRefusal(undefined)
    }

    onOpenChange(next)
  }

  const submit = () => {
    const asked = wholeNumber(priority)

    if (asked === undefined || !withinPriority(asked)) {
      setProblem({
        field: 'priority',
        text: `優先度は ${PRIORITY_RANGE.least} 〜 ${PRIORITY_RANGE.most} の半角数字です。`,
      })

      return
    }

    const margins: [Named, string][] = [
      ['before', before],
      ['after', after],
    ]
    const read: Partial<Record<Named, number>> = {}

    for (const [field, value] of margins) {
      const seconds = wholeNumber(value)

      if (seconds === undefined || !withinMargin(seconds)) {
        setProblem({
          field,
          text: `マージンは ${MARGIN_RANGE.least} 〜 ${MARGIN_RANGE.most} 秒の半角数字です。`,
        })

        return
      }

      read[field] = seconds
    }

    const revision: ReservationRevision = {}

    if (asked !== booking.priority) {
      revision.priority = asked
    }

    if (read.before !== booking.marginBeforeSeconds) {
      revision.marginBeforeSeconds = read.before
    }

    if (read.after !== booking.marginAfterSeconds) {
      revision.marginAfterSeconds = read.after
    }

    if (encode !== booking.encodeWhenRecorded) {
      revision.encodeWhenRecorded = encode
    }

    if (Object.keys(revision).length === 0) {
      setProblem(undefined)
      setRefusal(NOTHING_CHANGED)

      return
    }

    setProblem(undefined)
    setRefusal(undefined)

    startTransition(async () => {
      const result = await onRevise(booking.id, revision)

      if (result.state === 'ok') {
        close(false)

        return
      }

      setRefusal(
        result.state === 'unauthenticated' ? SIGNED_OUT : result.message,
      )
    })
  }

  const inline = layout !== 'dialog'
  const ids = inline ? `-${booking.id}` : ''
  const number = (
    field: Named,
    id: string,
    label: string,
    value: string,
    onChange: (next: string) => void,
    range: { least: number; most: number },
    step: number,
  ) => (
    <Field className={cn(layout === 'row' && 'gap-2')}>
      <FieldLabel
        htmlFor={`${id}${ids}`}
        className={cn(inline && 'text-sub font-semibold text-ink-2')}
      >
        {label}
        <RequiredMark />
      </FieldLabel>
      {inline ? (
        <Stepper
          id={`${id}${ids}`}
          value={value}
          onChange={onChange}
          range={range}
          step={step}
          invalid={problem?.field === field}
          describedBy={
            problem?.field === field ? `${id}-error${ids}` : undefined
          }
        />
      ) : (
        <>
          <Input
            id={`${id}${ids}`}
            inputMode="numeric"
            value={value}
            aria-invalid={problem?.field === field || undefined}
            aria-describedby={
              problem?.field === field ? `${id}-error${ids}` : undefined
            }
            onChange={(event) => onChange(event.target.value)}
          />
          <FieldHint>
            {range.least} 〜 {range.most}
          </FieldHint>
        </>
      )}
      <span aria-live="polite">
        {problem?.field === field && (
          <FieldError id={`${id}-error${ids}`}>{problem.text}</FieldError>
        )}
      </span>
    </Field>
  )
  const fields = (
    <div
      data-slot="dialog-body"
      className={cn(
        'flex min-h-0',
        layout === 'row' ? 'contents' : 'flex-col gap-4 overflow-y-auto',
      )}
    >
      {number(
        'priority',
        'reservation-priority',
        '優先度',
        priority,
        setPriority,
        PRIORITY_RANGE,
        1,
      )}
      {number(
        'before',
        'reservation-margin-before',
        '前マージン(秒)',
        before,
        setBefore,
        MARGIN_RANGE,
        MARGIN_STEP,
      )}
      {number(
        'after',
        'reservation-margin-after',
        '後マージン(秒)',
        after,
        setAfter,
        MARGIN_RANGE,
        MARGIN_STEP,
      )}

      <div
        className={cn(
          'flex flex-wrap items-center gap-2.5',
          layout === 'row' && 'h-9 self-end',
        )}
      >
        <Switch
          id={`reservation-encode${ids}`}
          checked={encode}
          onCheckedChange={setEncode}
        />
        <FieldLabel
          htmlFor={`reservation-encode${ids}`}
          className={cn(inline && 'text-ui font-semibold')}
        >
          自動エンコード
        </FieldLabel>
      </div>

      <span
        aria-live="polite"
        className={cn(layout === 'row' && 'order-last basis-full empty:hidden')}
      >
        {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
      </span>
    </div>
  )
  const choices = (
    <>
      <Button variant="tone" onClick={() => close(false)}>
        キャンセル
      </Button>
      <Button disabled={pending} onClick={submit}>
        保存する
      </Button>
    </>
  )

  if (inline) {
    return open ? (
      <div
        data-slot="reservation-change"
        className={cn(
          'flex',
          layout === 'row'
            ? 'flex-wrap items-start gap-x-[calc(22rem/16)] gap-y-4'
            : 'flex-col gap-4',
        )}
      >
        {fields}
        <div
          className={cn(
            'flex flex-wrap justify-end gap-2',
            layout === 'row' && 'ml-auto self-end',
          )}
        >
          {choices}
        </div>
      </div>
    ) : null
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>予約を変更</DialogTitle>
          <DialogDescription>{booking.title}</DialogDescription>
        </DialogHeader>
        {fields}
        <DialogFooter>{choices}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
