'use client'

import { useState } from 'react'

import type {
  EncodeDestination,
  EncodeProfile,
  EncodeWrite,
} from '@/repository/encode'
import type { EncodeDestinationDraft } from '@/repository/encode-terms'
import { DestinationDialog } from '@/components/encode/destination-dialog'
import { ChangeButton } from '@/components/encode/change-button'

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
