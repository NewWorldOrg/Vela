import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, waitFor, within } from 'storybook/test'

import {
  LOGO_DARK_INK,
  LOGO_FULL_COLOUR,
  LOGO_NONE_BROADCAST,
  LOGO_NOT_YET_READ,
  LOGO_SOLID_BLOCK,
  LOGO_UNREADABLE,
  LOGO_WIDER,
} from '@/repository/logos.fixtures'
import type { StationLogo } from '@/repository/channels'
import { SectionHeading } from '@/components/vela/section-heading'
import { Surface } from '@/components/vela/surface'
import { MarkPill } from '@/components/vela/icons'
import { ChannelMark } from '@/components/vela/channel-mark'

const meta = {
  title: 'Components/ChannelMark',
  component: ChannelMark,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ChannelMark>

export default meta
type Story = StoryObj<typeof meta>

const READ: [string, string, StationLogo][] = [
  ['151', 'みなと総合1', LOGO_SOLID_BLOCK],
  ['131', '中央テレビ1', LOGO_DARK_INK],
  ['161', '東都テレビ1', LOGO_FULL_COLOUR],
  ['101', '北総放送1', LOGO_WIDER],
]

const STANDING_IN: [string, string, string, StationLogo | undefined][] = [
  ['171', '湾岸放送1', '放送していない', LOGO_NONE_BROADCAST],
  ['181', '第一テレビ1', 'まだ読んでいない', LOGO_NOT_YET_READ],
  ['141', 'シティ MX1', '絵が読めない', LOGO_UNREADABLE],
  ['', 'BS みなと', '番号もない', LOGO_NOT_YET_READ],
]

function Row({
  no,
  name,
  note,
  logo,
  on,
}: {
  no: string
  name: string
  note?: string
  logo?: StationLogo
  on?: boolean
}) {
  return (
    <div className="flex items-center gap-[11px] border-b border-dashed border-line py-2.5 last:border-b-0">
      <ChannelMark logo={logo} no={no === '' ? undefined : no} on={on} />
      <span className="min-w-0 flex-1 truncate text-ui font-bold">{name}</span>
      {note && <span className="shrink-0 text-note text-ink-3">{note}</span>}
    </div>
  )
}

export const States: Story = {
  render: () => (
    <div className="mx-auto max-w-[520px] p-6">
      <SectionHeading mark={MarkPill}>読み取れている局</SectionHeading>
      <Surface className="py-0.5">
        {READ.map(([no, name, logo]) => (
          <Row key={no} no={no} name={name} logo={logo} />
        ))}
      </Surface>
      <SectionHeading mark={MarkPill}>絵のない局</SectionHeading>
      <Surface className="py-0.5">
        {STANDING_IN.map(([no, name, note, logo]) => (
          <Row key={name} no={no} name={name} note={note} logo={logo} />
        ))}
      </Surface>
      <SectionHeading mark={MarkPill}>選んでいる行</SectionHeading>
      <Surface className="py-0.5">
        <Row no="151" name="みなと総合1" logo={LOGO_SOLID_BLOCK} on />
        <Row no="181" name="第一テレビ1" logo={LOGO_NOT_YET_READ} on />
      </Surface>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await waitFor(() =>
      expect(canvasElement.querySelectorAll('img')).toHaveLength(5),
    )
    await expect(canvas.getByText('141')).toBeVisible()
    await expect(canvas.getByText('171')).toBeVisible()
    await expect(canvas.getByText('BS みなと')).toBeVisible()
  },
}

export const ManyMissing: Story = {
  render: () => (
    <div className="mx-auto max-w-[520px] p-6">
      <SectionHeading mark={MarkPill}>27 列のうち 3 局</SectionHeading>
      <Surface className="py-0.5">
        {Array.from({ length: 27 }, (_, nth) => {
          const no = String(11 + nth * 10).padStart(3, '0')
          const logo =
            nth === 0
              ? LOGO_SOLID_BLOCK
              : nth === 3
                ? LOGO_DARK_INK
                : nth === 6
                  ? LOGO_FULL_COLOUR
                  : nth === 9
                    ? LOGO_NONE_BROADCAST
                    : LOGO_NOT_YET_READ

          return <Row key={no} no={no} name={`地上テレビ ${no}`} logo={logo} />
        })}
      </Surface>
    </div>
  ),
}
