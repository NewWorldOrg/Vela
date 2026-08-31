'use client'

import { useState, type ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EyeIcon, EyeOffIcon } from '@/components/vela/icons'

/**
 * A password field with the masking on a switch. Typing something you cannot
 * read means a refusal and a typo look the same, and the field that decides
 * whether a password change happens at all is the worst place for that.
 *
 * The switch sits beside the field rather than over it. `tap-target` lays a
 * 44px area over whatever carries it, and an area laid over a text field
 * answers the press instead of the field — so a control inside this one would
 * take the right-hand end of the field away from the pointer, and with it
 * clicking to a character and dragging a selection.
 *
 * Revealing is per mount: the dialog this sits in takes its fields down when
 * it closes, so nothing stays readable behind it.
 */
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
