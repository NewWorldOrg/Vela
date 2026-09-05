import Link from 'next/link'

import { cn } from '@/lib/utils'
import type {
  EncodeDestination,
  EncodeProfile,
  EncodeScreen,
  EncodeWrite,
} from '@/repository/encode'
import type {
  EncodeDestinationDraft,
  EncodeProfileDraft,
} from '@/repository/encode-terms'
import {
  CODEC_LABEL,
  DEINTERLACE_LABEL,
  RESOLUTION_LABEL,
} from '@/repository/encode-terms'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ADMIN_LIST_HEIGHT_CAP,
  Crumb,
  CrumbCurrent,
} from '@/components/vela/app-shell'
import { EmptyState } from '@/components/vela/empty-state'
import { MarkDots, MarkPanel, MarkSplit } from '@/components/vela/icons'
import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import { AddDestinationDialog } from '@/components/encode/add-destination-dialog'
import { AddProfileDialog } from '@/components/encode/add-profile-dialog'
import { EncodeTicker } from '@/components/encode/encode-ticker'
import { JobCounts } from '@/components/encode/job-counts'
import { JobTable } from '@/components/encode/job-table'
import { JobsFilter, JobsPager } from '@/components/encode/jobs-navigation'
import { RunningJob } from '@/components/encode/running-job'

const PROFILE_COLUMNS = [
  '名称',
  'コーデック',
  '解像度',
  '品質(CRF)',
  '品質(QP)',
  'インタレース解除',
  '作成',
]

const DESTINATION_COLUMNS = ['名称', '出力ルート', '既定のプロファイル', '作成']

const STICKY_HEAD = '[&>tr>th]:sticky [&>tr>th]:top-0 [&>tr>th]:z-10'

const STAMP = 'font-code text-sub tabular-nums whitespace-nowrap text-ink-2'

export interface EncodeActions {
  onDefineProfile: (draft: EncodeProfileDraft) => Promise<EncodeWrite>
  onDefineDestination: (draft: EncodeDestinationDraft) => Promise<EncodeWrite>
  onCallOff: (id: string) => Promise<EncodeWrite>
}

export function EncodeView({
  screen,
  actions,
}: {
  screen: EncodeScreen
  actions: EncodeActions
}) {
  const { jobs, running, profiles, destinations, roots } = screen

  return (
    <>
      <EncodeTicker active={running !== null || screen.waiting > 0} />
      <Crumb>
        設定 / <CrumbCurrent>エンコード</CrumbCurrent>
      </Crumb>
      <PageHeading>エンコード</PageHeading>

      <section className="mt-5">
        <SectionHeading mark={MarkDots}>ジョブの現在地</SectionHeading>

        {running && <RunningJob job={running} />}

        <JobCounts
          waiting={screen.waiting}
          failed={screen.failed}
          className={cn(
            'flex flex-wrap items-center gap-2',
            running && 'mt-2.5',
          )}
        />

        <div className="mt-3.5">
          <JobsFilter jobs={jobs} />
          {jobs.items.length > 0 ? (
            <>
              <JobTable jobs={jobs.items} onCallOff={actions.onCallOff} />
              <JobsPager jobs={jobs} />
            </>
          ) : jobs.status ? (
            <EmptyState spot="tape" title="条件に合うジョブがありません" />
          ) : (
            <EmptyState
              spot="tape"
              title="ジョブの履歴がありません"
              action={
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/library">ライブラリを開く</Link>
                </Button>
              }
            />
          )}
        </div>
      </section>

      <section className="mt-9">
        <SectionHeading mark={MarkPanel}>プロファイル</SectionHeading>
        {profiles.length > 0 ? (
          <>
            <div className="mb-2.5 flex justify-end">
              <AddProfileDialog
                variant="sm"
                onDefine={actions.onDefineProfile}
              />
            </div>
            <ProfileTable profiles={profiles} />
          </>
        ) : (
          <EmptyState
            spot="star"
            title="プロファイルがありません"
            action={<AddProfileDialog onDefine={actions.onDefineProfile} />}
          />
        )}
      </section>

      <section className="mt-9">
        <SectionHeading mark={MarkSplit}>保存先</SectionHeading>
        {destinations.length > 0 ? (
          <>
            <div className="mb-2.5 flex justify-end">
              <AddDestinationDialog
                variant="sm"
                profiles={profiles}
                roots={roots}
                onDefine={actions.onDefineDestination}
              />
            </div>
            <DestinationTable destinations={destinations} />
          </>
        ) : (
          <EmptyState
            spot="tuner"
            title="保存先がありません"
            action={
              <AddDestinationDialog
                profiles={profiles}
                roots={roots}
                onDefine={actions.onDefineDestination}
              />
            }
          />
        )}
      </section>
    </>
  )
}

function ProfileTable({ profiles }: { profiles: EncodeProfile[] }) {
  return (
    <Table
      className="min-w-[760px]"
      containerClassName={cn(ADMIN_LIST_HEIGHT_CAP, 'overflow-y-auto pb-1')}
    >
      <TableHeader className={STICKY_HEAD}>
        <TableRow>
          {PROFILE_COLUMNS.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {profiles.map((profile) => (
          <TableRow key={profile.id}>
            <TableCell>
              <b className="block text-[13px] font-bold">{profile.label}</b>
            </TableCell>
            <TableCell className="font-code">
              {CODEC_LABEL[profile.codec]}
            </TableCell>
            <TableCell>{RESOLUTION_LABEL[profile.resolution]}</TableCell>
            <TableCell className="font-code tabular-nums">
              {profile.rateFactor}
            </TableCell>
            <TableCell className="font-code tabular-nums">
              {profile.quantiser}
            </TableCell>
            <TableCell>{DEINTERLACE_LABEL[profile.deinterlace]}</TableCell>
            <TableCell className={STAMP}>{profile.definedAt}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function DestinationTable({
  destinations,
}: {
  destinations: EncodeDestination[]
}) {
  return (
    <Table
      className="min-w-[640px]"
      containerClassName={cn(ADMIN_LIST_HEIGHT_CAP, 'overflow-y-auto pb-1')}
    >
      <TableHeader className={STICKY_HEAD}>
        <TableRow>
          {DESTINATION_COLUMNS.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {destinations.map((destination) => (
          <TableRow key={destination.id}>
            <TableCell>
              <b className="block text-[13px] font-bold">{destination.label}</b>
            </TableCell>
            <TableCell className="font-code">
              {destination.outputRoot}
            </TableCell>
            <TableCell>
              {destination.defaultProfileLabel ?? (
                <span className="text-ink-3">—</span>
              )}
            </TableCell>
            <TableCell className={STAMP}>{destination.definedAt}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
