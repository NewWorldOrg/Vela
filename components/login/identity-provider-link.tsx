'use client'

import type { ComponentProps } from 'react'

import { askForTheCurtain } from '@/components/vela/curtain'

export function IdentityProviderLink(props: ComponentProps<'a'>) {
  return <a {...props} onClick={() => askForTheCurtain()} />
}
