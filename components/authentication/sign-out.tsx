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

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true)
        await signOut()
        window.location.assign(
          `${SIGNED_OUT_PATH}?${SIGNED_OUT_METHOD_KEY}=${method}`,
        )
      }}
    >
      ログアウト
    </Button>
  )
}
