'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { wordFor } from '@/lib/not-yet-in-this-build'
import type {
  EncodeProfile,
  EncodeRemoval,
  EncodeWrite,
} from '@/repository/encode'
import type {
  EncodeProfileDraft,
  EncodeRemoved,
} from '@/repository/encode-terms'
import {
  CODEC_LABEL,
  DEINTERLACE_LABEL,
  RESOLUTION_LABEL,
} from '@/repository/encode-terms'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ADMIN_LIST_HEIGHT_CAP } from '@/components/vela/app-shell'
import { AddProfileDialog } from '@/components/encode/add-profile-dialog'
import { ChangeProfileButton } from '@/components/encode/change-definition-button'
import {
  DefinitionName,
  RemovalNotice,
  ROW_OPS,
  STAMP,
  STICKY_HEAD,
  RETIRED_ROW,
} from '@/components/encode/definition-list'
import { RemoveDefinitionButton } from '@/components/encode/remove-definition-button'

const COLUMNS: { label: string; hidden?: boolean }[] = [
  { label: '名称' },
  { label: 'コーデック' },
  { label: '解像度' },
  { label: '品質(CRF)' },
  { label: '品質(QP)' },
  { label: 'インタレース解除' },
  { label: '作成' },
  { label: '操作', hidden: true },
]

export function ProfileList({
  profiles,
  onDefine,
  onRevise,
  onRemove,
}: {
  profiles: EncodeProfile[]
  onDefine: (draft: EncodeProfileDraft) => Promise<EncodeWrite>
  onRevise: (id: string, draft: EncodeProfileDraft) => Promise<EncodeWrite>
  onRemove: (id: string) => Promise<EncodeRemoval>
}) {
  const [removed, setRemoved] = useState<{
    label: string
    removal: EncodeRemoved
  }>()

  return (
    <>
      <div className="mb-2.5 flex flex-wrap items-center justify-end gap-2">
        <RemovalNotice removed={removed} />
        <AddProfileDialog variant="sm" onDefine={onDefine} />
      </div>

      <Table
        className="min-w-[930px]"
        containerClassName={cn(ADMIN_LIST_HEIGHT_CAP, 'overflow-y-auto pb-1')}
      >
        <TableHeader className={STICKY_HEAD}>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column.label}>
                {column.hidden ? (
                  <span className="sr-only">{column.label}</span>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.map((profile) => (
            <TableRow
              key={profile.id}
              className={profile.retired ? RETIRED_ROW : undefined}
            >
              <TableCell>
                <DefinitionName
                  label={profile.label}
                  retired={profile.retired}
                />
              </TableCell>
              <TableCell className="font-code">
                {wordFor(CODEC_LABEL, profile.codec)}
              </TableCell>
              <TableCell>
                {wordFor(RESOLUTION_LABEL, profile.resolution)}
              </TableCell>
              <TableCell className="font-code tabular-nums">
                {profile.rateFactor}
              </TableCell>
              <TableCell className="font-code tabular-nums">
                {profile.quantiser}
              </TableCell>
              <TableCell>
                {wordFor(DEINTERLACE_LABEL, profile.deinterlace)}
              </TableCell>
              <TableCell className={STAMP}>{profile.definedAt}</TableCell>
              <TableCell className="text-right">
                {!profile.retired && (
                  <span className={ROW_OPS}>
                    <ChangeProfileButton
                      profile={profile}
                      onRevise={onRevise}
                    />
                    <RemoveDefinitionButton
                      kind="プロファイル"
                      label={profile.label}
                      onRemove={() => onRemove(profile.id)}
                      onRemoved={(removal) =>
                        setRemoved({ label: profile.label, removal })
                      }
                    />
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
