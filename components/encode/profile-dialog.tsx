'use client'

import { useState, useTransition } from 'react'

import { labelProblem, rateControlProblem } from '@/lib/encode'
import type { EncodeProfile, EncodeWrite } from '@/repository/encode'
import type {
  Deinterlace,
  EncodeCodec,
  EncodeProfileDraft,
  EncodeResolution,
} from '@/repository/encode-terms'
import {
  CODEC_OPTIONS,
  DEINTERLACE_OPTIONS,
  PROFILE_DRAFT_DEFAULTS,
  RATE_CONTROL_COARSEST,
  RATE_CONTROL_FINEST,
  RESOLUTION_OPTIONS,
} from '@/repository/encode-terms'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InlineAlert } from '@/components/vela/banner'
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
  RequiredMark,
} from '@/components/vela/field'
import { SegmentedControl } from '@/components/vela/segmented-control'

const RANGE_HINT = `${RATE_CONTROL_FINEST} 〜 ${RATE_CONTROL_COARSEST}`

type ProblemField = 'label' | 'rateFactor' | 'quantiser'

export function ProfileDialog({
  profile,
  open,
  onOpenChange,
  onSave,
}: {
  profile?: EncodeProfile
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (draft: EncodeProfileDraft) => Promise<EncodeWrite>
}) {
  const stands = profile ?? PROFILE_DRAFT_DEFAULTS
  const [label, setLabel] = useState(profile?.label ?? '')
  const [codec, setCodec] = useState<EncodeCodec>(stands.codec)
  const [resolution, setResolution] = useState<EncodeResolution>(
    stands.resolution,
  )
  const [deinterlace, setDeinterlace] = useState<Deinterlace>(
    stands.deinterlace,
  )
  const [rateFactor, setRateFactor] = useState(String(stands.rateFactor))
  const [quantiser, setQuantiser] = useState(String(stands.quantiser))
  const [problem, setProblem] = useState<{
    field: ProblemField
    text: string
  }>()
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  const title = profile ? 'プロファイルを変更' : 'プロファイルを追加'
  const verb = profile ? '変更' : '追加'

  const submit = () => {
    const labelText = labelProblem(label)

    if (labelText) {
      setProblem({ field: 'label', text: labelText })

      return
    }

    const rateText = rateControlProblem(rateFactor)

    if (rateText) {
      setProblem({ field: 'rateFactor', text: rateText })

      return
    }

    const quantiserText = rateControlProblem(quantiser)

    if (quantiserText) {
      setProblem({ field: 'quantiser', text: quantiserText })

      return
    }

    setProblem(undefined)
    setRefusal(undefined)

    startTransition(async () => {
      const result = await onSave({
        label: label.trim(),
        codec,
        resolution,
        deinterlace,
        rateFactor: Number(rateFactor),
        quantiser: Number(quantiser),
      })

      if (result.state === 'ok') {
        onOpenChange(false)

        return
      }

      setRefusal(
        result.state === 'unauthenticated'
          ? `サインインが切れているため、${verb}できませんでした。`
          : result.message,
      )
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            エンコードのプロファイルを{verb}します。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="profile-label">
              名称
              <RequiredMark />
            </FieldLabel>
            <Input
              id="profile-label"
              value={label}
              aria-invalid={problem?.field === 'label' || undefined}
              aria-describedby={
                problem?.field === 'label' ? 'profile-label-error' : undefined
              }
              onChange={(event) => setLabel(event.target.value)}
            />
            <span aria-live="polite">
              {problem?.field === 'label' && (
                <FieldError id="profile-label-error">{problem.text}</FieldError>
              )}
            </span>
          </Field>

          <div className="grid gap-4 min-[701px]:grid-cols-2">
            <Field>
              <FieldLabel>コーデック</FieldLabel>
              <SegmentedControl
                aria-label="コーデック"
                options={CODEC_OPTIONS}
                value={codec}
                onValueChange={(next) => setCodec(next as EncodeCodec)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="profile-resolution">解像度</FieldLabel>
              <Select
                value={resolution}
                onValueChange={(next) =>
                  setResolution(next as EncodeResolution)
                }
              >
                <SelectTrigger id="profile-resolution">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {RESOLUTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="profile-deinterlace">
                インタレース解除
              </FieldLabel>
              <Select
                value={deinterlace}
                onValueChange={(next) => setDeinterlace(next as Deinterlace)}
              >
                <SelectTrigger id="profile-deinterlace">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {DEINTERLACE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="profile-rate-factor">品質(CRF)</FieldLabel>
              <Input
                id="profile-rate-factor"
                inputMode="numeric"
                className="font-code tabular-nums"
                value={rateFactor}
                aria-invalid={problem?.field === 'rateFactor' || undefined}
                aria-describedby={
                  problem?.field === 'rateFactor'
                    ? 'profile-rate-factor-error'
                    : undefined
                }
                onChange={(event) => setRateFactor(event.target.value)}
              />
              <FieldHint>{RANGE_HINT}</FieldHint>
              <span aria-live="polite">
                {problem?.field === 'rateFactor' && (
                  <FieldError id="profile-rate-factor-error">
                    {problem.text}
                  </FieldError>
                )}
              </span>
            </Field>

            <Field>
              <FieldLabel htmlFor="profile-quantiser">品質(QP)</FieldLabel>
              <Input
                id="profile-quantiser"
                inputMode="numeric"
                className="font-code tabular-nums"
                value={quantiser}
                aria-invalid={problem?.field === 'quantiser' || undefined}
                aria-describedby={
                  problem?.field === 'quantiser'
                    ? 'profile-quantiser-error'
                    : undefined
                }
                onChange={(event) => setQuantiser(event.target.value)}
              />
              <FieldHint>{RANGE_HINT}</FieldHint>
              <span aria-live="polite">
                {problem?.field === 'quantiser' && (
                  <FieldError id="profile-quantiser-error">
                    {problem.text}
                  </FieldError>
                )}
              </span>
            </Field>
          </div>

          <span aria-live="polite">
            {refusal && <InlineAlert tone="warn">{refusal}</InlineAlert>}
          </span>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button disabled={pending} onClick={submit}>
            {verb}する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
