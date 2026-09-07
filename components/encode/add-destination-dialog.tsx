'use client'

import { useState } from 'react'

import type { EncodeProfile, EncodeWrite } from '@/repository/encode'
import type { EncodeDestinationDraft } from '@/repository/encode-terms'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@/components/vela/icons'
import { DestinationDialog } from '@/components/encode/destination-dialog'

export function AddDestinationDialog({
  profiles,
  roots,
  onDefine,
  variant = 'default',
}: {
  profiles: Pick<EncodeProfile, 'id' | 'label'>[]
  roots: string[]
  onDefine: (draft: EncodeDestinationDraft) => Promise<EncodeWrite>
  variant?: 'default' | 'sm'
}) {
  const [open, setOpen] = useState(false)
  const refused =
    profiles.length === 0
      ? 'プロファイルがないため追加できません'
      : roots.length === 0
        ? '選べる出力ルートがないため追加できません'
        : undefined

  return (
    <>
      <Button
        size={variant === 'sm' ? 'sm' : 'default'}
        disabled={refused !== undefined}
        title={refused}
        onClick={() => setOpen(true)}
      >
        <PlusIcon />
        保存先を追加
      </Button>
      {open && (
        <DestinationDialog
          profiles={profiles}
          roots={roots}
          open
          onOpenChange={setOpen}
          onSave={onDefine}
        />
      )}
    </>
  )
}
