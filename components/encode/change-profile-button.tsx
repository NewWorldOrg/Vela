'use client'

import { useState } from 'react'

import type { EncodeProfile, EncodeWrite } from '@/repository/encode'
import type { EncodeProfileDraft } from '@/repository/encode-terms'
import { ProfileDialog } from '@/components/encode/profile-dialog'
import { ChangeButton } from '@/components/encode/change-definition-button'

export function ChangeProfileButton({
  profile,
  onRevise,
}: {
  profile: EncodeProfile
  onRevise: (id: string, draft: EncodeProfileDraft) => Promise<EncodeWrite>
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ChangeButton label={profile.label} onOpen={() => setOpen(true)} />
      {open && (
        <ProfileDialog
          profile={profile}
          open
          onOpenChange={setOpen}
          onSave={(draft) => onRevise(profile.id, draft)}
        />
      )}
    </>
  )
}
