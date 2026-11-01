import type { SegmentStatus } from '@/repository/segment-status'
import type { Reading } from '@/repository/system'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import {
  MarkAxis,
  MarkDots,
  MarkPill,
  MarkRuler,
} from '@/components/vela/icons'
import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import {
  LEARNING_DATA_SLOT,
  LearningDataPanel,
} from '@/components/segments/learning-data-panel'
import {
  PRECISION_SLOT,
  PrecisionPanel,
} from '@/components/segments/precision-panel'
import type { SettleSkipThreshold } from '@/components/segments/skip-threshold-panel'
import { SkipThresholdPanel } from '@/components/segments/skip-threshold-panel'
import { UnreadSurface } from '@/components/segments/value-rows'
import type {
  ChooseSegmentVersion,
  LeaveSegmentVersionToLearning,
} from '@/components/segments/version-history'
import { VersionHistory } from '@/components/segments/version-history'
import {
  SKIP_THRESHOLD_SLOT,
  VERSIONS_HEADING,
} from '@/components/segments/wording'

const SEGMENTS = 'CM・OP・ED の検出'

const VERSIONS_SLOT = 'segment-versions'

const LATER = 'mt-[calc(26rem/16)]'

export interface SegmentsActions {
  onChooseVersion: ChooseSegmentVersion
  onLeaveVersionToLearning: LeaveSegmentVersionToLearning
  onSettleSkipThreshold: SettleSkipThreshold
}

export function SegmentsView({
  status,
  actions,
}: {
  status: Reading<SegmentStatus>
  actions: SegmentsActions
}) {
  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>{SEGMENTS}</CrumbCurrent>
      </Crumb>
      <PageHeading>{SEGMENTS}</PageHeading>
      {status.state === 'ok' ? (
        <Read status={status.value} actions={actions} />
      ) : (
        <Unread reading={status} />
      )}
    </>
  )
}

function Read({
  status,
  actions,
}: {
  status: SegmentStatus
  actions: SegmentsActions
}) {
  return (
    <>
      <section className="mt-5">
        <SectionHeading>精度</SectionHeading>
        <PrecisionPanel status={status} />
      </section>

      <section data-slot={VERSIONS_SLOT} className={LATER}>
        <VersionHistory
          versions={status.versions}
          byHand={status.version.byHand}
          lastRound={status.lastRound}
          nextRound={status.nextRound}
          onChoose={actions.onChooseVersion}
          onLeaveToLearning={actions.onLeaveVersionToLearning}
        />
      </section>

      <section className={LATER}>
        <SectionHeading>飛ばすボタン</SectionHeading>
        <SkipThresholdPanel
          threshold={status.skipThreshold}
          onSettle={actions.onSettleSkipThreshold}
        />
      </section>

      <section className={LATER}>
        <SectionHeading>学習に使うデータ</SectionHeading>
        <LearningDataPanel
          data={status.learningData}
          catalog={status.catalog}
        />
      </section>
    </>
  )
}

function Unread({
  reading,
}: {
  reading: Exclude<Reading<SegmentStatus>, { state: 'ok' }>
}) {
  return (
    <>
      <section className="mt-5">
        <SectionHeading>精度</SectionHeading>
        <UnreadSurface slot={PRECISION_SLOT} reading={reading} />
      </section>

      <section data-slot={VERSIONS_SLOT} className={LATER}>
        <SectionHeading>{VERSIONS_HEADING}</SectionHeading>
        <UnreadSurface slot="segment-version-table" reading={reading} />
      </section>

      <section className={LATER}>
        <SectionHeading>飛ばすボタン</SectionHeading>
        <UnreadSurface slot={SKIP_THRESHOLD_SLOT} reading={reading} />
      </section>

      <section className={LATER}>
        <SectionHeading>学習に使うデータ</SectionHeading>
        <UnreadSurface slot={LEARNING_DATA_SLOT} reading={reading} />
      </section>
    </>
  )
}
