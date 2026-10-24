'use client'

import { useState } from 'react'

import type { EncodeWrite } from '@/repository/encode'
import type {
  EncodeProfileDefaults,
  EncodeProfileDraft,
} from '@/repository/encode-terms'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@/components/vela/icons'
import { ProfileDialog } from '@/components/encode/profile-dialog'

export function AddProfileDialog({
  defaults,
  onDefine,
  size = 'default',
}: {
  defaults: EncodeProfileDefaults
  onDefine: (draft: EncodeProfileDraft) => Promise<EncodeWrite>
  size?: 'default' | 'sm'
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size={size} onClick={() => setOpen(true)}>
        <PlusIcon />
        プロファイルを追加
      </Button>
      {open && (
        <ProfileDialog
          defaults={defaults}
          open
          onOpenChange={setOpen}
          onSave={onDefine}
        />
      )}
    </>
  )
}
