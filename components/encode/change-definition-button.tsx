'use client'

import { useState } from 'react'

import type {
  EncodeDestination,
  EncodeProfile,
  EncodeWrite,
} from '@/repository/encode'
import type {
  EncodeDestinationDraft,
  EncodeProfileDraft,
} from '@/repository/encode-terms'
import { Button } from '@/components/ui/button'
import { DestinationDialog } from '@/components/encode/destination-dialog'
import { ProfileDialog } from '@/components/encode/profile-dialog'

function ChangeButton({
  label,
  onOpen,
}: {
  label: string
  onOpen: () => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`${label} を変更`}
      onClick={onOpen}
    >
      変更
    </Button>
  )
}

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

export function ChangeDestinationButton({
  destination,
  profiles,
  roots,
  onRevise,
}: {
  destination: EncodeDestination
  profiles: Pick<EncodeProfile, 'id' | 'label'>[]
  roots: string[]
  onRevise: (id: string, draft: EncodeDestinationDraft) => Promise<EncodeWrite>
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ChangeButton label={destination.label} onOpen={() => setOpen(true)} />
      {open && (
        <DestinationDialog
          destination={destination}
          profiles={profiles}
          roots={roots}
          open
          onOpenChange={setOpen}
          onSave={(draft) => onRevise(destination.id, draft)}
        />
      )}
    </>
  )
}
