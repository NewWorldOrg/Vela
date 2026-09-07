'use client'

import { useState, type ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EyeIcon, EyeOffIcon } from '@/components/vela/icons'

export function PasswordInput({
  disabled,
  ...props
}: Omit<ComponentProps<typeof Input>, 'type' | 'areaClassName'>) {
  const [shown, setShown] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <Input
        type={shown ? 'text' : 'password'}
        areaClassName="min-w-0 flex-1"
        disabled={disabled}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        aria-pressed={shown}
        aria-controls={props.id}
        aria-label={shown ? 'パスワードを隠す' : 'パスワードを表示する'}
        onClick={() => setShown(!shown)}
      >
        {shown ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
    </div>
  )
}
