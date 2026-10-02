'use client'

import { useState } from 'react'

import type { EncodeProfile, EncodeWrite } from '@/repository/encode'
import type { EncodeDestinationDraft } from '@/repository/encode-terms'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@/components/vela/icons'
import { DestinationDialog } from '@/components/encode/destination-dialog'

function refusing(profiles: number, roots: number): string | undefined {
  if (profiles === 0) {
    return 'プロファイルがないため追加できません'
  }

  if (roots === 0) {
    return '選べる出力ルートがないため追加できません'
  }

  return undefined
}

export function AddDestinationDialog({
  profiles,
  roots,
  onDefine,
  size = 'default',
}: {
  profiles: Pick<EncodeProfile, 'id' | 'label'>[]
  roots: string[]
  onDefine: (draft: EncodeDestinationDraft) => Promise<EncodeWrite>
  size?: 'default' | 'sm'
}) {
  const [open, setOpen] = useState(false)
  const refused = refusing(profiles.length, roots.length)

  return (
    <>
      <Button
        size={size}
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
