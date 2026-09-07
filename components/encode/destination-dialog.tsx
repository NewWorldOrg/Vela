'use client'

import { useState, useTransition } from 'react'

import { labelProblem } from '@/lib/encode'
import type {
  EncodeDestination,
  EncodeProfile,
  EncodeWrite,
} from '@/repository/encode'
import type { EncodeDestinationDraft } from '@/repository/encode-terms'
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
  FieldLabel,
  RequiredMark,
} from '@/components/vela/field'

type ProblemField = 'label' | 'outputRoot' | 'defaultProfileId'

export function DestinationDialog({
  destination,
  profiles,
  roots,
  open,
  onOpenChange,
  onSave,
}: {
  destination?: EncodeDestination
  profiles: Pick<EncodeProfile, 'id' | 'label'>[]
  roots: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (draft: EncodeDestinationDraft) => Promise<EncodeWrite>
}) {
  const held =
    destination && !roots.includes(destination.outputRoot)
      ? [destination.outputRoot, ...roots]
      : roots
  const [label, setLabel] = useState(destination?.label ?? '')
  const [outputRoot, setOutputRoot] = useState<string>(
    destination?.outputRoot ?? held[0] ?? '',
  )
  const [defaultProfileId, setDefaultProfileId] = useState<string>(
    destination?.defaultProfileId ?? profiles[0]?.id ?? '',
  )
  const [problem, setProblem] = useState<{
    field: ProblemField
    text: string
  }>()
  const [refusal, setRefusal] = useState<string>()
  const [pending, startTransition] = useTransition()

  const title = destination ? '保存先を変更' : '保存先を追加'
  const verb = destination ? '変更' : '追加'

  const submit = () => {
    const labelText = labelProblem(label)

    if (labelText) {
      setProblem({ field: 'label', text: labelText })

      return
    }

    if (!outputRoot) {
      setProblem({ field: 'outputRoot', text: '出力ルートを選んでください。' })

      return
    }

    if (!defaultProfileId) {
      setProblem({
        field: 'defaultProfileId',
        text: '既定のプロファイルを選んでください。',
      })

      return
    }

    setProblem(undefined)
    setRefusal(undefined)

    startTransition(async () => {
      const result = await onSave({
        label: label.trim(),
        outputRoot,
        defaultProfileId,
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
            エンコードの保存先を{verb}します。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="destination-label">
              名称
              <RequiredMark />
            </FieldLabel>
            <Input
              id="destination-label"
              value={label}
              aria-invalid={problem?.field === 'label' || undefined}
              aria-describedby={
                problem?.field === 'label'
                  ? 'destination-label-error'
                  : undefined
              }
              onChange={(event) => setLabel(event.target.value)}
            />
            <span aria-live="polite">
              {problem?.field === 'label' && (
                <FieldError id="destination-label-error">
                  {problem.text}
                </FieldError>
              )}
            </span>
          </Field>

          <div className="grid gap-4 min-[701px]:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="destination-root">
                出力ルート
                <RequiredMark />
              </FieldLabel>
              <Select value={outputRoot} onValueChange={setOutputRoot}>
                <SelectTrigger
                  id="destination-root"
                  className="font-code"
                  aria-invalid={problem?.field === 'outputRoot' || undefined}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {held.map((root) => (
                    <SelectItem key={root} value={root} className="font-code">
                      {root}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span aria-live="polite">
                {problem?.field === 'outputRoot' && (
                  <FieldError>{problem.text}</FieldError>
                )}
              </span>
            </Field>

            <Field>
              <FieldLabel htmlFor="destination-profile">
                既定のプロファイル
                <RequiredMark />
              </FieldLabel>
              <Select
                value={defaultProfileId}
                onValueChange={setDefaultProfileId}
              >
                <SelectTrigger
                  id="destination-profile"
                  aria-invalid={
                    problem?.field === 'defaultProfileId' || undefined
                  }
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span aria-live="polite">
                {problem?.field === 'defaultProfileId' && (
                  <FieldError>{problem.text}</FieldError>
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
