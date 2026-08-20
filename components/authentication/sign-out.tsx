'use client'

import { useState } from 'react'

import {
  SIGNED_OUT_METHOD_KEY,
  SIGNED_OUT_PATH,
  signOut,
  type AuthMethod,
} from '@/repository/auth'
import { Button } from '@/components/ui/button'

/**
 * The device reading this page leaves by signing out, which drops its own
 * session only. Revoking it from the list would say the same thing in the
 * language of the other rows, and read as though it could be undone.
 */
export function SignOut({ method }: { method: AuthMethod }) {
  const [pending, setPending] = useState(false)
  const [refused, setRefused] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={async () => {
          setPending(true)
          setRefused(false)

          if (!(await signOut())) {
            setPending(false)
            setRefused(true)

            return
          }

          window.location.assign(
            `${SIGNED_OUT_PATH}?${SIGNED_OUT_METHOD_KEY}=${method}`,
          )
        }}
      >
        ログアウト
      </Button>
      <span aria-live="polite">
        {refused && (
          <small className="mt-1 block text-cap text-coral">
            ログアウトの要求が届きませんでした。もう一度お試しください
          </small>
        )}
      </span>
    </>
  )
}
