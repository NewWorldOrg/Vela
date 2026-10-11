import type { Meta, StoryObj } from '@storybook/nextjs'
import type { ComponentType } from 'react'

import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import * as Icons from '@/components/vela/icons'
import type { IconProps } from '@/components/vela/icons'

const meta = {
  title: 'Foundations/Icons',
  parameters: { layout: 'fullscreen' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const NAVIGATION: [string, ComponentType<IconProps>][] = [
  ['ProgramGuideIcon', Icons.ProgramGuideIcon],
  ['LiveIcon', Icons.LiveIcon],
  ['LiveEndedIcon', Icons.LiveEndedIcon],
  ['PlayIcon', Icons.PlayIcon],
  ['PauseIcon', Icons.PauseIcon],
  ['PlayGlyph', Icons.PlayGlyph],
  ['PauseGlyph', Icons.PauseGlyph],
  ['SeekArrowGlyph', Icons.SeekArrowGlyph],
  ['SkipBackIcon', () => <Icons.SkipBackIcon seconds={10} />],
  ['SkipForwardIcon', () => <Icons.SkipForwardIcon seconds={10} />],
  ['VolumeIcon (0)', () => <Icons.VolumeIcon level={0} />],
  ['VolumeIcon (1/3)', () => <Icons.VolumeIcon level={0.3} />],
  ['VolumeIcon (2/3)', () => <Icons.VolumeIcon level={0.6} />],
  ['VolumeIcon (max)', () => <Icons.VolumeIcon level={1} />],
  ['FullscreenIcon', () => <Icons.FullscreenIcon />],
  ['FullscreenIcon (leaving)', () => <Icons.FullscreenIcon leaving />],
  ['CaptionsGlyph', Icons.CaptionsGlyph],
  ['DataBroadcastIcon', Icons.DataBroadcastIcon],
  ['AirPlayIcon', Icons.AirPlayIcon],
  ['CaptureIcon', Icons.CaptureIcon],
  ['PictureInPictureIcon', Icons.PictureInPictureIcon],
  ['RecordIcon', Icons.RecordIcon],
  ['RelayIcon', Icons.RelayIcon],
  ['OutcomeTruncatedIcon', Icons.OutcomeTruncatedIcon],
  ['OutcomeFailedIcon', Icons.OutcomeFailedIcon],
  ['ThumbShotIcon', Icons.ThumbShotIcon],
  ['ThumbPendingIcon', Icons.ThumbPendingIcon],
  ['ThumbMissingIcon', Icons.ThumbMissingIcon],
  ['ThumbErrorIcon', Icons.ThumbErrorIcon],
  ['LibraryIcon', Icons.LibraryIcon],
  ['ReservationIcon', Icons.ReservationIcon],
  ['LedgerIcon', Icons.LedgerIcon],
  ['SettingsIcon', Icons.SettingsIcon],
  ['TunerIcon', Icons.TunerIcon],
  ['TunerTerrestrialIcon', Icons.TunerTerrestrialIcon],
  ['TunerSatelliteIcon', Icons.TunerSatelliteIcon],
  ['ChannelIcon', Icons.ChannelIcon],
  ['EncodeIcon', Icons.EncodeIcon],
  ['QualityIcon', Icons.QualityIcon],
  ['SystemIcon', Icons.SystemIcon],
  ['DisplayIcon', Icons.DisplayIcon],
  ['PersonIcon', Icons.PersonIcon],
  ['KeyIcon', Icons.KeyIcon],
  ['DeviceDesktopIcon', Icons.DeviceDesktopIcon],
  ['DeviceTabletIcon', Icons.DeviceTabletIcon],
  ['DevicePhoneIcon', Icons.DevicePhoneIcon],
  ['DevicePlayerIcon', Icons.DevicePlayerIcon],
]

const ACTIONS: [string, ComponentType<IconProps>][] = [
  ['PlusIcon', Icons.PlusIcon],
  ['EditIcon', Icons.EditIcon],
  ['TrashIcon', Icons.TrashIcon],
  ['SearchIcon', Icons.SearchIcon],
  ['SignInIcon', Icons.SignInIcon],
  ['CloseIcon', Icons.CloseIcon],
  ['CheckIcon', Icons.CheckIcon],
  ['SuccessIcon', Icons.SuccessIcon],
  ['DotIcon', Icons.DotIcon],
  ['ChevronLeftIcon', Icons.ChevronLeftIcon],
  ['ChevronRightIcon', Icons.ChevronRightIcon],
  ['ChevronDownIcon', Icons.ChevronDownIcon],
  ['ChevronUpIcon', Icons.ChevronUpIcon],
  ['CalendarIcon', Icons.CalendarIcon],
  ['ClockIcon', Icons.ClockIcon],
  ['ListIcon', Icons.ListIcon],
  ['FilterIcon', Icons.FilterIcon],
  ['InfoIcon', Icons.InfoIcon],
  ['WarningIcon', Icons.WarningIcon],
  ['DangerIcon', Icons.DangerIcon],
  ['SignalIcon', Icons.SignalIcon],
  ['AntennaIcon', Icons.AntennaIcon],
  ['CollectIcon', Icons.CollectIcon],
  ['RebuildIcon', Icons.RebuildIcon],
  ['LockIcon', Icons.LockIcon],
  ['EyeIcon', Icons.EyeIcon],
  ['EyeOffIcon', Icons.EyeOffIcon],
  ['LinkIcon', Icons.LinkIcon],
  ['CopyIcon', Icons.CopyIcon],
  ['SunIcon', Icons.SunIcon],
  ['MoonIcon', Icons.MoonIcon],
]

const MARKS: [string, ComponentType<IconProps>][] = [
  ['MarkStar', Icons.MarkStar],
  ['MarkDoubleCircle', Icons.MarkDoubleCircle],
  ['MarkSlashes', Icons.MarkSlashes],
  ['MarkPanel', Icons.MarkPanel],
  ['MarkCup', Icons.MarkCup],
  ['MarkDots', Icons.MarkDots],
  ['MarkPill', Icons.MarkPill],
  ['MarkAxis', Icons.MarkAxis],
  ['MarkRuler', Icons.MarkRuler],
  ['MarkType', Icons.MarkType],
  ['MarkSplit', Icons.MarkSplit],
  ['MarkDevices', Icons.MarkDevices],
]

function IconGrid({ items }: { items: [string, ComponentType<IconProps>][] }) {
  return (
    <Surface>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(124px,1fr))] gap-4">
        {items.map(([name, Component]) => (
          <div key={name} className="flex flex-col items-center gap-1.5">
            <Component className="size-6 text-ink" />
            <span className="font-code text-[9.5px] text-ink-3">{name}</span>
          </div>
        ))}
      </div>
    </Surface>
  )
}

export const IconSet: Story = {
  render: () => (
    <div className="mx-auto max-w-[760px] p-6">
      <section className="mb-7">
        <SectionHeading mark={Icons.MarkStar}>
          ナビゲーション・領域
        </SectionHeading>
        <IconGrid items={NAVIGATION} />
      </section>

      <section className="mb-7">
        <SectionHeading mark={Icons.MarkPill}>操作・状態</SectionHeading>
        <IconGrid items={ACTIONS} />
      </section>

      <section className="mb-7">
        <SectionHeading mark={Icons.MarkDots}>セクションマーク</SectionHeading>
        <IconGrid items={MARKS} />
        <p className="mt-[9px] text-note text-ink-3">
          セクション見出しの前に置く小さなマーク。同じ形を使い回さず、区画ごとに変える。
        </p>
      </section>
    </div>
  ),
}
