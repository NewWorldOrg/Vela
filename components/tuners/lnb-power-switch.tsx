'use client'

import { useState, useTransition } from 'react'

import type { LnbPower, TunerWriteResult } from '@/repository/tuners'
import { signedOut } from '@/lib/signed-out'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { InlineAlert } from '@/components/vela/banner'

export const LNB_NOT_APPLIED = '未反映'

function refusalOf(result: TunerWriteResult, on: boolean): string | undefined {
  switch (result.state) {
    case 'ok':
      return undefined
    case 'unauthenticated':
      return signedOut(`LNB 給電を${on ? 'オン' : 'オフ'}に`)
    case 'rejected':
      return result.message
  }
}

export function LnbPowerSwitch({
  deviceId,
  lnb,
  onSave,
}: {
  deviceId: string
  lnb: LnbPower
  onSave: (deviceId: string, on: boolean) => Promise<TunerWriteResult>
}) {
  const [pending, startTransition] = useTransition()
  const [asking, setAsking] = useState(false)
  const [refusal, setRefusal] = useState<string>()
  const [askedRefusal, setAskedRefusal] = useState<string>()

  const turnOff = () => {
    setRefusal(undefined)

    startTransition(async () => {
      setRefusal(refusalOf(await onSave(deviceId, false), false))
    })
  }

  const turnOn = () => {
    setAskedRefusal(undefined)

    startTransition(async () => {
      const said = refusalOf(await onSave(deviceId, true), true)

      if (said === undefined) {
        setAsking(false)

        return
      }

      setAskedRefusal(said)
    })
  }

  const notApplied = lnb.applied !== undefined && lnb.applied !== lnb.saved

  return (
    <>
      <Switch
        size="sm"
        checked={lnb.saved}
        aria-disabled={pending}
        aria-label={`${deviceId} の LNB 給電`}
        className="aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
        onCheckedChange={(next) => {
          if (pending) {
            return
          }

          setRefusal(undefined)

          if (next) {
            setAskedRefusal(undefined)
            setAsking(true)

            return
          }

          turnOff()
        }}
      />
      {notApplied && (
        <span className="mt-1 block text-cap leading-[1.5] text-lemon">
          {LNB_NOT_APPLIED}
        </span>
      )}
      <span
        aria-live="polite"
        className={cn(
          'block text-cap leading-[1.5]',
          refusal
            ? 'mt-1 max-w-[calc(180rem/16)] whitespace-normal text-coral'
            : 'sr-only',
        )}
      >
        {refusal}
      </span>

      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>LNB 給電をオンにします</AlertDialogTitle>
            <AlertDialogDescription>
              {deviceId} からアンテナ線へ給電します。
            </AlertDialogDescription>
          </AlertDialogHeader>

          <span aria-live="polite">
            {askedRefusal && (
              <InlineAlert tone="warn">{askedRefusal}</InlineAlert>
            )}
          </span>

          <AlertDialogFooter>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setAsking(false)}
            >
              キャンセル
            </Button>
            <Button disabled={pending} onClick={turnOn}>
              オンにする
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
