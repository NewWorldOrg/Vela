'use client'

import { useState, useTransition } from 'react'

import type { CandidateTuning, WriteResult } from '@/repository/services'
import type { ScanSystem } from '@/repository/scan-systems'
import { SCAN_SYSTEMS, SYSTEM_LABEL } from '@/repository/scan-systems'
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
import { InlineAlert } from '@/components/vela/banner'
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
  RequiredMark,
} from '@/components/vela/field'
import { SegmentedControl } from '@/components/vela/segmented-control'

/**
 * What each system will take. The API refuses anything outside these with its
 * own English prose, so the form holds the same rule and says why in Japanese.
 */
const CHANNEL_RANGE: Record<
  ScanSystem,
  { hint: string; ts: boolean; accepts: (channel: number) => boolean }
> = {
  isdbT: {
    hint: '13 〜 62',
    ts: false,
    accepts: (channel) => channel >= 13 && channel <= 62,
  },
  isdbSBs: {
    hint: '1 〜 23 の奇数(7 と 17 を除く)',
    ts: true,
    accepts: (channel) =>
      channel >= 1 &&
      channel <= 23 &&
      channel % 2 === 1 &&
      ![7, 17].includes(channel),
  },
  isdbSCs110: {
    hint: '2 〜 24 の偶数',
    ts: false,
    accepts: (channel) => channel >= 2 && channel <= 24 && channel % 2 === 0,
  },
}

const TSID_MAX = 65535

function toNumber(value: string): number | undefined {
  const trimmed = value.trim()

  return trimmed !== '' && /^\d+$/.test(trimmed) ? Number(trimmed) : undefined
}

/**
 * A candidate added by hand. A BS slot carries several streams so it names the
 * one it wants; the other two filter no stream and naming one is refused.
 */
export function AddCandidateDialog({
  serviceKey,
  serviceName,
  open,
  onOpenChange,
  onAdd,
}: {
  serviceKey: string
  serviceName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (serviceKey: string, tuning: CandidateTuning) => Promise<WriteResult>
}) {
  const [system, setSystem] = useState<ScanSystem>('isdbT')
  const [channel, setChannel] = useState('')
  const [stream, setStream] = useState('')
  const [problem, setProblem] = useState<{
    field: 'channel' | 'stream'
    text: string
  }>()
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  const needsStream = CHANNEL_RANGE[system].ts

  const close = (next: boolean) => {
    if (!next) {
      setChannel('')
      setStream('')
      setProblem(undefined)
      setRefusal(undefined)
    }

    onOpenChange(next)
  }

  const submit = () => {
    const physicalChannel = toNumber(channel)

    if (physicalChannel === undefined) {
      setProblem({
        field: 'channel',
        text: '物理チャンネルを半角数字で入力してください。',
      })

      return
    }

    if (!CHANNEL_RANGE[system].accepts(physicalChannel)) {
      setProblem({
        field: 'channel',
        text: `${SYSTEM_LABEL[system]}の物理チャンネルは ${CHANNEL_RANGE[system].hint} です。`,
      })

      return
    }

    const transportStreamId = needsStream ? toNumber(stream) : undefined

    if (needsStream && transportStreamId === undefined) {
      setProblem({
        field: 'stream',
        text: 'BS はスロット内の TSID を半角数字で入力してください。',
      })

      return
    }

    if (transportStreamId !== undefined && transportStreamId > TSID_MAX) {
      setProblem({ field: 'stream', text: `TSID は 0 〜 ${TSID_MAX} です。` })

      return
    }

    setProblem(undefined)
    setRefusal(undefined)

    startTransition(async () => {
      const result = await onAdd(serviceKey, {
        system,
        physicalChannel,
        transportStreamId,
      })

      if (result.state === 'ok') {
        close(false)

        return
      }

      setRefusal(
        result.state === 'unauthenticated'
          ? 'サインインが切れているため、追加できませんでした。'
          : result.message,
      )
    })
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      {/* Closing empties the form, so a press that lands beside it is treated
          as a miss rather than as a decision to throw the entry away. The X,
          キャンセル and Escape all still close it. */}
      <DialogContent onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>候補チャンネルを手動追加</DialogTitle>
          <DialogDescription>
            {serviceName} に候補チャンネルを追加します。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel>
              方式
              <RequiredMark />
            </FieldLabel>
            <SegmentedControl
              aria-label="方式"
              options={SCAN_SYSTEMS}
              value={system}
              onValueChange={(next) => {
                setSystem(next as ScanSystem)
                setProblem(undefined)
              }}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="candidate-channel">
              物理チャンネル
              <RequiredMark />
            </FieldLabel>
            <Input
              id="candidate-channel"
              inputMode="numeric"
              value={channel}
              aria-invalid={problem?.field === 'channel' || undefined}
              aria-describedby={
                problem?.field === 'channel'
                  ? 'candidate-channel-error'
                  : undefined
              }
              onChange={(event) => setChannel(event.target.value)}
            />
            <FieldHint>{CHANNEL_RANGE[system].hint}</FieldHint>
            <span aria-live="polite">
              {problem?.field === 'channel' && (
                <FieldError id="candidate-channel-error">
                  {problem.text}
                </FieldError>
              )}
            </span>
          </Field>

          {needsStream && (
            <Field>
              <FieldLabel htmlFor="candidate-stream">
                TSID
                <RequiredMark />
              </FieldLabel>
              <Input
                id="candidate-stream"
                inputMode="numeric"
                value={stream}
                aria-invalid={problem?.field === 'stream' || undefined}
                aria-describedby={
                  problem?.field === 'stream'
                    ? 'candidate-stream-error'
                    : undefined
                }
                onChange={(event) => setStream(event.target.value)}
              />
              <FieldHint>0 〜 65535</FieldHint>
              <span aria-live="polite">
                {problem?.field === 'stream' && (
                  <FieldError id="candidate-stream-error">
                    {problem.text}
                  </FieldError>
                )}
              </span>
            </Field>
          )}

          <span aria-live="polite">
            {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
          </span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)}>
            キャンセル
          </Button>
          <Button disabled={pending} onClick={submit}>
            追加する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
