'use client'

import {
  type NotificationDestination,
  type NotificationRuleSet,
  type NotificationWrite,
  type RuleSetDraft,
} from '@/lib/notifications'
import { Dialog } from '@/components/ui/dialog'
import { NoticeDialogContent } from '@/components/notifications/notice-dialog-content'
import { RuleSetForm } from '@/components/notifications/rule-set-form'

/** The editor of a rule set: its name, whether it is on, the events it sends, and where it sends them. `削除` stands only for a rule set that already is. */
export function RuleSetDialog({
  ruleSet,
  destinations,
  open,
  onOpenChange,
  onSave,
  onRemove,
}: {
  ruleSet?: NotificationRuleSet
  destinations: Pick<NotificationDestination, 'id' | 'name'>[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (draft: RuleSetDraft) => Promise<NotificationWrite>
  onRemove?: () => Promise<NotificationWrite>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <NoticeDialogContent>
        {open && (
          <RuleSetForm
            ruleSet={ruleSet}
            destinations={destinations}
            onClose={() => onOpenChange(false)}
            onSave={onSave}
            onRemove={onRemove}
          />
        )}
      </NoticeDialogContent>
    </Dialog>
  )
}
