'use client'

import { useState } from 'react'

import type { EncodeWrite } from '@/repository/encode'
import type { EncodeProfileDraft } from '@/repository/encode-terms'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@/components/vela/icons'
import { ProfileDialog } from '@/components/encode/profile-dialog'

export function AddProfileDialog({
  onDefine,
  variant = 'default',
}: {
  onDefine: (draft: EncodeProfileDraft) => Promise<EncodeWrite>
  variant?: 'default' | 'sm'
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        size={variant === 'sm' ? 'sm' : 'default'}
        onClick={() => setOpen(true)}
      >
        <PlusIcon />
        プロファイルを追加
      </Button>
      {open && <ProfileDialog open onOpenChange={setOpen} onSave={onDefine} />}
    </>
  )
}
