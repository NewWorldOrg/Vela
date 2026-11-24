import type { SegmentedOption } from '@/components/vela/segmented-control'
import type { QualityWindow } from '@/repository/quality'

export function segmentsOf(windows: QualityWindow[]): SegmentedOption[] {
  return windows.map((one) => ({
    value: one.label,
    label: one.label,
    href: one.href,
  }))
}

export function chosenOf(windows: QualityWindow[]): string | undefined {
  return windows.find((one) => one.current)?.label
}
