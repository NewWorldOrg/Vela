import type { LearningData, SegmentStatus } from '@/repository/segment-status'
import type { Reading } from '@/repository/system'
import { Crumb, CrumbCurrent } from '@/components/vela/app-shell'
import { MarkDots } from '@/components/vela/icons'
import { PageHeading, SectionHeading } from '@/components/vela/section-heading'
import { LearningDataPanel } from '@/components/segments/learning-data-panel'

const SEGMENTS = 'CM・OP・ED'

function learningDataOf(status: Reading<SegmentStatus>): Reading<LearningData> {
  return status.state === 'ok'
    ? { state: 'ok', value: status.value.learningData }
    : status
}

export function SegmentsView({ status }: { status: Reading<SegmentStatus> }) {
  return (
    <>
      <Crumb>
        設定 / <CrumbCurrent>{SEGMENTS}</CrumbCurrent>
      </Crumb>
      <PageHeading>{SEGMENTS}</PageHeading>

      <section className="mt-5">
        <SectionHeading mark={MarkDots}>学習に使うデータ</SectionHeading>
        <LearningDataPanel reading={learningDataOf(status)} />
      </section>
    </>
  )
}
