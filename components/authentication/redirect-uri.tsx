'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { CheckIcon, CopyIcon } from '@/components/vela/icons'

/**
 * The value the identity provider has to hold before any of the rest works:
 * registration is per host name, and calling authorize does not prove it was
 * done — an unregistered URI only fails after the sign-in completes. So it is
 * shown first, and it can be copied rather than retyped.
 */
export function RedirectUri({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <code className="min-w-0 flex-1 rounded-md bg-surface-2 px-3 py-2 font-code text-sub break-all text-ink">
        {value}
      </code>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(value)
          setCopied(true)
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? 'コピーしました' : 'コピー'}
      </Button>
    </div>
  )
}
