'use client'

import { useState, useTransition } from 'react'

import { cn } from '@/lib/utils'
import type { EncodeChoices, EncodeWrite } from '@/repository/encode'
import type { Recording } from '@/repository/recordings'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldLabel } from '@/components/vela/field'
import { EncodeIcon } from '@/components/vela/icons'
import { Spinner } from '@/components/vela/progress'

export type QueueEncode = (
  recordingId: string,
  destinationId: string,
  profileId?: string,
) => Promise<EncodeWrite>

function refusing(
  recording: Recording,
  choices: EncodeChoices,
): string | undefined {
  if (recording.outcome === 'recording') {
    return '録画中はエンコードできません'
  }

  if (choices.destinations.length === 0) {
    return '保存先がないためエンコードできません'
  }

  return undefined
}

export function encodes(recording: Recording): boolean {
  return recording.outcome !== 'failed'
}

export function EncodeButton({
  recording,
  choices,
  onQueue,
}: {
  recording: Recording
  choices: EncodeChoices
  onQueue: QueueEncode
}) {
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<{ queued: boolean; text: string }>()
  const [open, setOpen] = useState(false)
  const [destinationId, setDestinationId] = useState(
    choices.destinations[0]?.id ?? '',
  )
  const [profileId, setProfileId] = useState<string>('')
  const refused = refusing(recording, choices)
  const chooses = choices.destinations.length > 1 || choices.profiles.length > 1

  const queue = (destination: string, profile?: string) => {
    startTransition(async () => {
      setNotice(undefined)

      const result = await onQueue(recording.id, destination, profile)

      setNotice(
        result.state === 'ok'
          ? { queued: true, text: 'エンコードを登録しました。' }
          : result.state === 'unauthenticated'
            ? {
                queued: false,
                text: 'サインインが切れているため、登録できませんでした。',
              }
            : { queued: false, text: result.message },
      )
      setOpen(false)
    })
  }

  const press = () => {
    if (pending) {
      return
    }

    if (chooses) {
      setOpen(true)

      return
    }

    queue(choices.destinations[0].id)
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        variant="outline"
        disabled={refused !== undefined}
        title={refused}
        aria-disabled={pending}
        onClick={press}
      >
        {pending ? <Spinner className="size-3.5" /> : <EncodeIcon />}
        エンコード
      </Button>
      {notice && (
        <p
          role="status"
          className={cn(
            'text-note',
            notice.queued ? 'text-mint' : 'text-coral',
          )}
        >
          {notice.text}
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>エンコード</DialogTitle>
            <DialogDescription className="min-w-0 truncate">
              {recording.title}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 min-[701px]:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="encode-destination">保存先</FieldLabel>
              <Select value={destinationId} onValueChange={setDestinationId}>
                <SelectTrigger id="encode-destination">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {choices.destinations.map((destination) => (
                    <SelectItem key={destination.id} value={destination.id}>
                      {destination.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {choices.profiles.length > 1 && (
              <Field>
                <FieldLabel htmlFor="encode-profile">プロファイル</FieldLabel>
                <Select
                  value={
                    profileId ||
                    (choices.destinations.find(
                      (one) => one.id === destinationId,
                    )?.defaultProfileId ??
                      '')
                  }
                  onValueChange={setProfileId}
                >
                  <SelectTrigger id="encode-profile">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {choices.profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button
              disabled={pending || !destinationId}
              onClick={() => queue(destinationId, profileId || undefined)}
            >
              <EncodeIcon />
              エンコード
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
