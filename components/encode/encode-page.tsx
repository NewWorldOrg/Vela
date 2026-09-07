import Link from 'next/link'

import { cn } from '@/lib/utils'
import type {
  EncodeRemoval,
  EncodeScreen,
  EncodeWrite,
} from '@/repository/encode'
import type {
  EncodeDestinationDraft,
  EncodeProfileDraft,
} from '@/repository/encode-terms'
import { Button } from '@/components/ui/button'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { EmptyState } from '@/components/vela/empty-state'
import { MarkDots, MarkPanel, MarkSplit } from '@/components/vela/icons'
import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import { AddDestinationDialog } from '@/components/encode/add-destination-dialog'
import { AddProfileDialog } from '@/components/encode/add-profile-dialog'
import { DestinationList } from '@/components/encode/destination-list'
import { EncodeTicker } from '@/components/encode/encode-ticker'
import { JobCounts } from '@/components/encode/job-counts'
import { JobTable } from '@/components/encode/job-table'
import { JobsFilter, JobsPager } from '@/components/encode/jobs-navigation'
import { ProfileList } from '@/components/encode/profile-list'
import { RunningJob } from '@/components/encode/running-job'

export interface EncodeActions {
  onDefineProfile: (draft: EncodeProfileDraft) => Promise<EncodeWrite>
  onReviseProfile: (
    id: string,
    draft: EncodeProfileDraft,
  ) => Promise<EncodeWrite>
  onRemoveProfile: (id: string) => Promise<EncodeRemoval>
  onDefineDestination: (draft: EncodeDestinationDraft) => Promise<EncodeWrite>
  onReviseDestination: (
    id: string,
    draft: EncodeDestinationDraft,
  ) => Promise<EncodeWrite>
  onRemoveDestination: (id: string) => Promise<EncodeRemoval>
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
  const offered = profiles.filter((profile) => !profile.retired)

  return (
    <>
      <EncodeTicker active={running !== null || screen.waiting > 0} />
      <Crumb>
        設定 / <CrumbCurrent>エンコード</CrumbCurrent>
      </Crumb>
      <PageHeading>エンコード</PageHeading>

      <section className="mt-5">
        <SectionHeading mark={MarkDots}>ジョブの現在地</SectionHeading>

        {running && <RunningJob job={running} onCallOff={actions.onCallOff} />}

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
          <ProfileList
            profiles={profiles}
            onDefine={actions.onDefineProfile}
            onRevise={actions.onReviseProfile}
            onRemove={actions.onRemoveProfile}
          />
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
          <DestinationList
            destinations={destinations}
            profiles={offered}
            roots={roots}
            onDefine={actions.onDefineDestination}
            onRevise={actions.onReviseDestination}
            onRemove={actions.onRemoveDestination}
          />
        ) : (
          <EmptyState
            spot="tuner"
            title="保存先がありません"
            action={
              <AddDestinationDialog
                profiles={offered}
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
