'use client'

import {
  type DestinationRevision,
  type NotificationDestination,
  type NotificationWrite,
} from '@/lib/notifications'
import { Dialog } from '@/components/ui/dialog'
import { NoticeDialogContent } from '@/components/notifications/notice-dialog'
import { EditDestinationForm } from '@/components/notifications/edit-destination-form'

export function EditDestinationDialog({
  destination,
  open,
  onOpenChange,
  onRevise,
}: {
  destination: NotificationDestination
  open: boolean
  onOpenChange: (open: boolean) => void
  onRevise: (
    id: string,
    revision: DestinationRevision,
  ) => Promise<NotificationWrite>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <NoticeDialogContent>
        {open && (
          <EditDestinationForm
            destination={destination}
            onClose={() => onOpenChange(false)}
            onRevise={onRevise}
          />
        )}
      </NoticeDialogContent>
    </Dialog>
  )
}
